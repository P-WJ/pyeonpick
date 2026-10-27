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
# 분류는 브랜드명만 보고 맞혀야 하는 경우가 많아 20b보다 120b가 정확하다.
DEFAULT_MODEL = "openai/gpt-oss-120b"
MODEL = os.environ.get("GROQ_MODEL", "").strip() or DEFAULT_MODEL
# 무료 키는 모델별 일일 한도(TPD 20만)가 따로라, 크롤링 중 주 모델 한도가 차면 이 모델로 넘어간다.
# 어려운 상품 25개 기준 120b 대비 2~5개 더 틀리지만 '기타'로 남기는 것보다 낫다.
# 일괄 재분류(ai_classify.py)는 정확도를 위해 주 모델만 쓴다.
FALLBACK_MODEL = "openai/gpt-oss-20b"
# 50개·추론 low로는 응답 인덱스가 밀려 이웃 상품의 카테고리가 붙는 오류가 잦았다.
# 25개·추론 medium이 정확도가 가장 좋았다 (상품당 약 100토큰, 무료 키 TPM 8,000 이내).
BATCH_SIZE = 25
REASONING_EFFORT = "medium"
# gpt-oss는 추론 토큰도 출력 한도에 포함된다. 한도가 작으면 JSON이 잘려 상품이 '기타'로 남는다.
MAX_COMPLETION_TOKENS = 8192
# Supabase는 GET 쿼리스트링으로 필터를 보내므로 이름을 한 번에 다 넣으면
# URL 길이 제한("URL component 'query' too long")에 걸린다. 나눠서 조회한다.
NAME_QUERY_CHUNK_SIZE = 100
SLEEP_BETWEEN_BATCHES = 2.5
MAX_RETRIES = 5
# retry-after가 이보다 길면 분당 한도가 아니라 일일 한도(TPD/RPD)에 걸린 것이다.
DAILY_LIMIT_RETRY_AFTER_SECONDS = 120
DEFAULT_RATE_LIMIT_WAIT_SECONDS = 10

VALID_CATEGORIES = {"음료", "과자", "식품", "아이스크림", "생활용품"}

SYSTEM_PROMPT = """You classify Korean convenience-store (편의점) products by name into exactly one category.

음료 — anything you drink: water, soda, coffee, tea, juice, milk & flavored milk (바나나우유, 배스킨라빈스 딸기우유), drinkable yogurt, soy milk (베지밀), protein shakes, energy/vitamin/hangover drinks and shots (컨디션 병, 여명, 비타500, 부스터샷), beer, soju, wine, whisky, highball, makgeolli, tea bags/sticks (보리차 티백, 메밀차).
과자 — snacks and sweets: chips, crackers, cookies, biscuits, chocolate & choco bars, candy, gum, jelly & gummies (incl. 곤약젤리), marshmallow, nuts, popcorn, cereal bars, hot-choco mix, bread, cake, castella, roll cake, pie, rice cake desserts (찰떡, 모찌 not frozen).
아이스크림 — frozen desserts: ice cream, popsicles, ice bars, cones, sorbet, frozen mochi, 빙수. Many are named only by brand, e.g. 빠삐코, 비비빅, 메로나, 붕어싸만코, 월드콘, 구구콘, 투게더, 설레임, 폴라포, 죠스바, 수박바, 돼지바, 찰떡아이스, 와일드바디, 빵빠레, 슈퍼콘, 하겐다즈, 나뚜루, 라라스윗 바. A volume in ml does NOT make it a drink if it is ice cream (e.g. "제로바70ML" is an ice bar).
식품 — all other food for humans: lunch boxes, kimbap, sandwiches, burgers, ramen & cup noodles, instant rice (햇반), porridge (죽), dumplings, frozen meals, chicken, sausages & hot dogs (프랑크, 후랑크, 소시지, 천하장사, 맥스봉), fish cake (어묵), crab stick, tuna, spam, kimchi, seaweed (김), tofu, eggs, spoonable yogurt (요거트 cups), cheese, jerky (육포), dried squid, sauces, seasonings, health supplements, vitamins in tablet/jelly-stick form, hangover jelly sticks (컨디션스틱 ...g).
생활용품 — anything not eaten by people: shampoo, rinse, soap, body wash, toothpaste, toothbrush, mouthwash, skincare & cosmetics (리들샷, 앰플, 마스크팩), sanitary pads & liners (생리대, 라이너, 좋은느낌, 바디피트, 화이트), diapers, tissues, wet wipes, masks, detergent, fabric softener, cleaning products, batteries, stationery, toys (레고), stockings, socks, condoms, contact-lens solution, pet food and pet treats (시저, 펫, 강아지, 고양이).

Respond with one JSON object mapping every input index to its category, e.g. {"0":"음료","1":"식품"}. Use only these 5 Korean category names. Include every index."""


class DailyLimitExceeded(RuntimeError):
    """Groq 일일 한도(TPD/RPD) 초과 — 같은 날 재시도해도 소용없다."""


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


def _rate_limit_wait_seconds(response: httpx.Response, attempt: int) -> float:
    """429 응답의 retry-after(초)를 읽는다. 없으면 시도 횟수에 비례해 기다린다."""
    try:
        return float(response.headers["retry-after"])
    except (KeyError, ValueError):
        return DEFAULT_RATE_LIMIT_WAIT_SECONDS * (attempt + 1)


def _is_json_generation_failure(response: httpx.Response) -> bool:
    """json_object 모드에서 모델이 유효한 JSON을 못 만든 경우(일시적 — 재시도하면 대개 성공)."""
    return response.status_code == 400 and "json_validate_failed" in response.text


def classify_names(names: list[str], api_key: str, model: str = MODEL) -> dict[int, str]:
    """상품명 배치를 Groq API로 분류해 {입력 인덱스: 카테고리}를 반환한다.

    응답에서 빠진 인덱스는 결과에 없다. 일일 한도에 걸리면 DailyLimitExceeded.
    """
    user_msg = "\n".join(f"{i}: {name}" for i, name in enumerate(names))

    for attempt in range(MAX_RETRIES):
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0,
                "max_completion_tokens": MAX_COMPLETION_TOKENS,
                "reasoning_effort": REASONING_EFFORT,
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        if response.status_code == 429:
            wait = _rate_limit_wait_seconds(response, attempt)
            if wait > DAILY_LIMIT_RETRY_AFTER_SECONDS:
                raise DailyLimitExceeded(
                    f"Groq 일일 한도 초과 (model={model}, {wait:.0f}초 후 재시도 가능): {response.text[:200]}"
                )
            logger.warning("Groq rate limit, %.0f초 대기", wait)
            time.sleep(wait)
            continue
        if _is_json_generation_failure(response):
            logger.warning("Groq JSON 생성 실패(model=%s) — 재시도 %d/%d", model, attempt + 1, MAX_RETRIES)
            continue
        if response.status_code >= 400:
            # 404는 대개 모델이 계정에서 사용 불가한 경우 — 본문에 사유가 들어 있다
            logger.error(
                "Groq 응답 오류 (HTTP %d, model=%s): %s",
                response.status_code, model, response.text[:300],
            )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        return _parse_response(content, len(names))

    raise RuntimeError("Groq API 최대 재시도 초과")


# 이번 실행에서 일일 한도가 찬 모델 — 이후 배치·편의점에서 다시 시도하지 않는다
_exhausted_models: set[str] = set()


def _classify_with_fallback(names: list[str], api_key: str) -> dict[int, str]:
    """주 모델로 분류하고, 일일 한도가 차면 대체 모델로 넘어간다. 둘 다 차면 DailyLimitExceeded."""
    last_error: DailyLimitExceeded | None = None
    for model in dict.fromkeys([MODEL, FALLBACK_MODEL]):
        if model in _exhausted_models:
            continue
        try:
            return classify_names(names, api_key, model=model)
        except DailyLimitExceeded as error:
            logger.warning("%s — 대체 모델로 전환", error)
            _exhausted_models.add(model)
            last_error = error
    raise last_error or DailyLimitExceeded("모든 분류 모델의 일일 한도 초과")


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
            result = _classify_with_fallback(batch_names, api_key)
            for idx, category in result.items():
                batch_products[idx].category = category
            logger.info("AI 분류 배치 %d/%d 완료", batch_num + 1, total_batches)
        except DailyLimitExceeded as e:
            logger.error("%s — 남은 %d개 분류 건너뜀", e, len(names) - start)
            return
        except Exception as e:
            logger.error("AI 분류 배치 %d 실패: %s", batch_num + 1, e)

        if batch_num < total_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)
