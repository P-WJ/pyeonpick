"""Groq AI로 상품 카테고리 일괄 분류 스크립트.

처리 우선순위: 기타 → 간편식사 → 아이스크림 → 음료 → 과자 → 식품 → 생활용품
체크포인트: classify_progress.json에 진행 상황 저장 (중단 후 이어서 실행 가능)
"""
import sys
import json
import re
import time
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('crawler/.env')

import os
import httpx
from crawler.infrastructure.repository import _get_supabase_client

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
MODEL = 'llama-3.1-8b-instant'  # TPD 500,000 / RPD 14,400 — 대량 분류에 적합
BATCH_SIZE = 45
SLEEP_BETWEEN_BATCHES = 3   # 분당 20회 (8B TPM 131,072 기준 여유)
MAX_RETRIES = 3
CHECKPOINT_FILE = 'classify_progress.json'

CATEGORIES = ['음료', '과자', '식품', '아이스크림', '생활용품']

# 확실히 틀린 카테고리부터 처리
CATEGORY_PRIORITY = ['기타', '간편식사', '아이스크림', '음료', '과자', '식품', '생활용품']

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


def load_checkpoint() -> dict:
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {'completed_categories': [], 'current_category': None, 'current_batch': 0}


def save_checkpoint(completed_categories: list, current_category: str | None, current_batch: int) -> None:
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'completed_categories': completed_categories,
            'current_category': current_category,
            'current_batch': current_batch,
        }, f, ensure_ascii=False)


def fetch_products_by_category(client, category: str) -> list[dict]:
    products = []
    page = 0
    while True:
        result = (
            client.table('products')
            .select('id, name, category')
            .eq('category', category)
            .range(page * 1000, page * 1000 + 999)
            .execute()
        )
        rows = result.data or []
        products.extend(rows)
        if len(rows) < 1000:
            break
        page += 1
    return products


def _parse_response(content: str, products: list[dict]) -> dict[int, str]:
    if '```' in content:
        content = content.split('```')[1]
        if content.startswith('json'):
            content = content[4:]

    fixed = re.sub(r'(\w+)\s*:\s*([^\s,}]+)', r'"\1":"\2"', content.strip())
    try:
        result_raw = json.loads(fixed)
    except json.JSONDecodeError:
        result_raw = {}
        for m in re.finditer(r'["\']?(\d+)["\']?\s*:\s*["\']?([^,"}\s]+)["\']?', content):
            result_raw[m.group(1)] = m.group(2)

    return {
        products[int(k)]['id']: v
        for k, v in result_raw.items()
        if int(k) < len(products) and v in CATEGORIES
    }


def classify_batch(products: list[dict]) -> dict[int, str]:
    lines = [f'{i}: {p["name"]}' for i, p in enumerate(products)]
    user_msg = '\n'.join(lines)

    for attempt in range(MAX_RETRIES):
        response = httpx.post(
            GROQ_URL,
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': MODEL,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_msg},
                ],
                'temperature': 0,
                'max_tokens': 1024,
            },
            timeout=30,
        )
        if response.status_code == 429:
            retry_after = int(response.headers.get('retry-after', 15 * (attempt + 1)))
            wait = max(retry_after, 15 * (attempt + 1))
            print(f'  Rate limit, {wait}초 대기...')
            time.sleep(wait)
            continue
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content'].strip()
        return _parse_response(content, products)

    raise Exception('최대 재시도 초과')


def process_category(client, category: str, start_batch: int, total_updated: int) -> int:
    products = fetch_products_by_category(client, category)
    total_batches = (len(products) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f'\n[{category}] {len(products)}개 상품 / {total_batches}배치 (배치 {start_batch + 1}부터 시작)')

    if not products:
        return total_updated

    for batch_num in range(start_batch, total_batches):
        batch = products[batch_num * BATCH_SIZE:(batch_num + 1) * BATCH_SIZE]
        try:
            result = classify_batch(batch)
            changed = [
                (product_id, new_cat)
                for product_id, new_cat in result.items()
                if next(p for p in batch if p['id'] == product_id)['category'] != new_cat
            ]
            for product_id, new_cat in changed:
                client.table('products').update({'category': new_cat}).eq('id', product_id).execute()
            total_updated += len(changed)
            print(f'  배치 {batch_num + 1}/{total_batches} 완료 (변경: {len(changed)}개 / 누적: {total_updated}개)')
        except Exception as e:
            print(f'  배치 {batch_num + 1} 실패: {e}')

        # 체크포인트 저장 (배치 완료마다)
        save_checkpoint([], category, batch_num + 1)

        if batch_num < total_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)

    return total_updated


def main():
    if not GROQ_API_KEY:
        print('GROQ_API_KEY가 없습니다')
        sys.exit(1)

    client = _get_supabase_client()
    checkpoint = load_checkpoint()
    completed = set(checkpoint['completed_categories'])
    total_updated = 0

    print(f'처리 순서: {" → ".join(CATEGORY_PRIORITY)}')
    if completed:
        print(f'이미 완료된 카테고리: {", ".join(completed)}')

    for category in CATEGORY_PRIORITY:
        if category in completed:
            print(f'[{category}] 완료됨, 건너뜀')
            continue

        start_batch = 0
        if checkpoint['current_category'] == category:
            start_batch = checkpoint['current_batch']
            if start_batch > 0:
                print(f'[{category}] 배치 {start_batch + 1}부터 이어서 시작')

        total_updated = process_category(client, category, start_batch, total_updated)

        completed.add(category)
        save_checkpoint(list(completed), None, 0)
        print(f'[{category}] 완료')

    print(f'\n전체 완료: 총 {total_updated}개 상품 카테고리 업데이트')
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print('체크포인트 파일 삭제 완료')


if __name__ == '__main__':
    main()
