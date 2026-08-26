"""Groq AI를 사용한 상품 카테고리 분류."""
import json
import logging
import os
import re
import time

import httpx

from crawler.domain.entities import Product
from crawler.infrastructure.repository import _get_supabase_client

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# llama-3.1-8b-instant는 Groq에서 Enterprise 전용으로 바뀌어 일반 키로는 404가 난다.
# 모델 교체가 잦으므로 GROQ_MODEL 환경변수로 덮어쓸 수 있게 둔다.
DEFAULT_MODEL = "openai/gpt-oss-20b"
MODEL = os.environ.get("GROQ_MODEL", "").strip() or DEFAULT_MODEL
BATCH_SIZE = 80
# Supabase는 GET 쿼리스트링으로 필터를 보내므로 이름을 한 번에 다 넣으면
# URL 길이 제한("URL component 'query' too long")에 걸린다. 나눠서 조회한다.
NAME_QUERY_CHUNK_SIZE = 100
SLEEP_BETWEEN_BATCHES = 2.5
MAX_RETRIES = 5

VALID_CATEGORIES = {"음료", "과자", "식품", "아이스크림", "생활용품"}

SYSTEM_PROMPT = """You classify Korean convenience store products into exactly one of 5 categories.
Categories: 음료, 과자, 식품, 아이스크림, 생활용품

Rules:
- 음료: ALL drinks (water, coffee, juice, milk, soda, tea, beer, soju, wine, energy drink, kombucha, health drinks)
- 과자: snacks (chips, chocolate, jelly, candy, cookies, bread, cake, granola bar, nuts)
- 식품: ALL other edible items (ready meals, kimbap, ramen, rice, dumpling, sausage, hotdog, chicken, health supplements, vitamins, hangover products, protein, frozen fruit, tofu, eggs, seaweed, jerky, tuna, spam, seasonings, ingredients)
- 아이스크림: ice cream and popsicles only (NOT iced tea - that is 음료)
- 생활용품: household & personal care (shampoo, toothpaste, toothbrush, detergent, sanitary pads, lotion, skincare, stationery, mask, tissue, cleaning products)

Every product MUST be assigned one of these 5 categories. No other values allowed.

Respond ONLY with JSON like: {"0":"음료","1":"식품","2":"생활용품"}
No explanation. No other text. Just the JSON object."""


def _strip_code_block(content: str) -> str:
    """LLM 응답에서 마크다운 코드블록을 제거한다."""
    if "```" not in content:
        return content
    inner = content.split("```")[1]
    return inner[4:] if inner.startswith("json") else inner


def _parse_response(content: str, count: int) -> dict[int, str]:
    """모델 응답에서 {인덱스: 카테고리} 매핑을 추출한다."""
    content = _strip_code_block(content)
    fixed = re.sub(r"(\w+)\s*:\s*([^\s,}]+)", r'"\1":"\2"', content.strip())
    try:
        result_raw = json.loads(fixed)
    except json.JSONDecodeError:
        result_raw = {}
        for m in re.finditer(r'["\']?(\d+)["\']?\s*:\s*["\']?([^,"}\s]+)["\']?', content):
            result_raw[m.group(1)] = m.group(2)

    result: dict[int, str] = {}
    for k, v in result_raw.items():
        try:
            index = int(k)
        except (ValueError, TypeError):
            logger.warning("AI 분류 응답 인덱스 파싱 실패: %s", k)
            continue
        if 0 <= index < count and v in VALID_CATEGORIES:
            result[index] = v
    return result


def _classify_batch(names: list[str], api_key: str) -> dict[int, str]:
    """상품명 배치를 Groq API로 분류한다."""
    user_msg = "\n".join(f"{i}: {name}" for i, name in enumerate(names))

    for attempt in range(MAX_RETRIES):
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0,
                "max_tokens": 1024,
            },
            timeout=30,
        )
        if response.status_code == 429:
            wait = 10 * (attempt + 1)
            logger.warning("Groq rate limit, %d초 대기", wait)
            time.sleep(wait)
            continue
        if response.status_code >= 400:
            # 404는 대개 모델이 계정에서 사용 불가한 경우 — 본문에 사유가 들어 있다
            logger.error(
                "Groq 응답 오류 (HTTP %d, model=%s): %s",
                response.status_code, MODEL, response.text[:300],
            )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        return _parse_response(content, len(names))

    raise RuntimeError("Groq API 최대 재시도 초과")


def _fetch_existing_categories(store: str, names: list[str]) -> dict[str, str]:
    """DB에서 해당 편의점의 기존 카테고리를 조회해 {상품명: 카테고리} 반환.

    상품명이 많으면 URL 길이 제한에 걸리므로 NAME_QUERY_CHUNK_SIZE 단위로 나눠 조회한다.
    """
    if not names:
        return {}
    client = _get_supabase_client()
    existing: dict[str, str] = {}

    for start in range(0, len(names), NAME_QUERY_CHUNK_SIZE):
        chunk = names[start: start + NAME_QUERY_CHUNK_SIZE]
        result = (
            client.table("products")
            .select("name, category")
            .eq("store", store)
            .in_("name", chunk)
            .neq("category", "기타")
            .execute()
        )
        existing.update({row["name"]: row["category"] for row in result.data or []})

    return existing


def classify_products(products: list[Product]) -> None:
    """상품 목록의 category를 분류한다.

    DB에 이미 카테고리가 있는 상품은 기존 카테고리를 유지하고,
    새 상품만 Groq AI로 분류한다.
    """
    if not products:
        return

    api_key = os.environ.get("GROQ_API_KEY", "")
    store = products[0].store
    all_names = [p.name for p in products]

    # DB에서 기존 카테고리 조회
    existing = _fetch_existing_categories(store, all_names)

    # 기존 카테고리 적용 + 새 상품 분류 대상 추출
    new_products = []
    for product in products:
        if product.name in existing:
            product.category = existing[product.name]
        else:
            new_products.append(product)

    logger.info(
        "%s: 기존 %d개 카테고리 유지, 신규 %d개 AI 분류 필요",
        store, len(products) - len(new_products), len(new_products),
    )

    if not new_products or not api_key:
        if not api_key and new_products:
            logger.warning("GROQ_API_KEY 없음 — 신규 %d개 분류 건너뜀", len(new_products))
        return

    # 새 상품만 AI 분류
    names = [p.name for p in new_products]
    total_batches = (len(names) + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_num in range(total_batches):
        start = batch_num * BATCH_SIZE
        batch_names = names[start: start + BATCH_SIZE]
        batch_products = new_products[start: start + BATCH_SIZE]

        try:
            result = _classify_batch(batch_names, api_key)
            for idx, category in result.items():
                batch_products[idx].category = category
            logger.info("AI 분류 배치 %d/%d 완료", batch_num + 1, total_batches)
        except Exception as e:
            logger.error("AI 분류 배치 %d 실패: %s", batch_num + 1, e)

        if batch_num < total_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)
