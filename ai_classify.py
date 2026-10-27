"""Groq AI로 전체 상품 카테고리를 일괄 재분류하는 스크립트.

분류 프롬프트·모델은 크롤러(crawler/infrastructure/ai_classifier.py)와 공유한다.
미분류('기타') 상품을 먼저, 나머지는 id 순으로 처리하고 바뀐 카테고리만 DB에 반영한다.
체크포인트: classify_progress.json에 처리한 id 저장 (중단·일일 한도 초과 후 이어서 실행 가능)
"""
import sys
import json
import os
import time
from collections import defaultdict

sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('crawler/.env')

from crawler.infrastructure.ai_classifier import (
    BATCH_SIZE,
    MODEL,
    SLEEP_BETWEEN_BATCHES,
    DailyLimitExceeded,
    classify_names,
)
from crawler.infrastructure.repository import _get_supabase_client

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
CHECKPOINT_FILE = 'classify_progress.json'
FETCH_PAGE_SIZE = 1000  # Supabase 1회 조회 상한
UNCLASSIFIED_CATEGORY = '기타'


def load_done_ids() -> set[int]:
    if not os.path.exists(CHECKPOINT_FILE):
        return set()
    with open(CHECKPOINT_FILE, encoding='utf-8') as f:
        return set(json.load(f).get('done_ids', []))


def save_done_ids(done_ids: set[int]) -> None:
    with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'done_ids': sorted(done_ids)}, f)


def fetch_all_products(client) -> list[dict]:
    products = []
    cursor = 0
    while True:
        rows = (
            client.table('products')
            .select('id, name, category')
            .gt('id', cursor)
            .order('id')
            .limit(FETCH_PAGE_SIZE)
            .execute()
        ).data or []
        products.extend(rows)
        if len(rows) < FETCH_PAGE_SIZE:
            return products
        cursor = rows[-1]['id']


def update_categories(client, changed: dict[int, str]) -> None:
    """바뀐 상품을 카테고리별로 묶어 한 번씩 update한다."""
    ids_by_category: dict[str, list[int]] = defaultdict(list)
    for product_id, category in changed.items():
        ids_by_category[category].append(product_id)
    for category, ids in ids_by_category.items():
        client.table('products').update({'category': category}).in_('id', ids).execute()


def main():
    if not GROQ_API_KEY:
        print('GROQ_API_KEY가 없습니다')
        sys.exit(1)

    client = _get_supabase_client()
    done_ids = load_done_ids()
    products = [p for p in fetch_all_products(client) if p['id'] not in done_ids]
    products.sort(key=lambda p: (p['category'] != UNCLASSIFIED_CATEGORY, p['id']))
    total_batches = (len(products) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f'모델: {MODEL}')
    print(f'대상: {len(products)}개 / {total_batches}배치 (이미 처리 {len(done_ids)}개)')

    total_changed = 0
    total_missing = 0
    for batch_num in range(total_batches):
        batch = products[batch_num * BATCH_SIZE:(batch_num + 1) * BATCH_SIZE]
        try:
            result = classify_names([p['name'] for p in batch], GROQ_API_KEY)
        except DailyLimitExceeded as e:
            print(f'\n{e}')
            print(f'진행 상황 저장됨 ({len(done_ids)}개 처리). 한도가 풀린 뒤 다시 실행하면 이어서 처리합니다.')
            sys.exit(2)
        except Exception as e:
            # 이 배치는 체크포인트에 넣지 않으므로 재실행 시 다시 처리된다
            print(f'  배치 {batch_num + 1} 실패: {e} — 중단합니다')
            sys.exit(1)

        changed = {
            batch[index]['id']: category
            for index, category in result.items()
            if batch[index]['category'] != category
        }
        update_categories(client, changed)

        total_changed += len(changed)
        total_missing += len(batch) - len(result)
        done_ids.update(p['id'] for p in batch)
        save_done_ids(done_ids)
        print(
            f'  배치 {batch_num + 1}/{total_batches} 완료 '
            f'(변경 {len(changed)} / 응답 누락 {len(batch) - len(result)} / 누적 변경 {total_changed})'
        )

        if batch_num < total_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)

    print(f'\n전체 완료: {total_changed}개 카테고리 변경, 응답 누락 {total_missing}개(기존 값 유지)')
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print('체크포인트 파일 삭제 완료')


if __name__ == '__main__':
    main()
