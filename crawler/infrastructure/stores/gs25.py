import asyncio
import json
import logging
import random
from datetime import date, timedelta

import httpx

from crawler.domain.entities import Product
from crawler.infrastructure.common import infer_category

logger = logging.getLogger(__name__)

STORE_NAME = "GS25"
SLEEP_MIN = 1.0
SLEEP_MAX = 2.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
# GS25 서버가 https:// 요청을 pageNo=1 고정인 http:// URL로 302 리다이렉트함.
# 리다이렉트 목적지인 http:// URL을 직접 사용해야 pageNo가 올바르게 전달된다.
# 단, pageNo 파라미터 자체가 서버에서 무시되므로 pageSize를 충분히 크게 설정해
# 단일 요청으로 전체 상품을 수집한다.
AJAX_URL = "http://gs25.gsretail.com/gscvs/ko/products/event-goods-search"
REFERER_URL = "http://gs25.gsretail.com/gscvs/ko/products/event-goods"
PAGE_SIZE = 10000  # 서버 응답 전체를 한 번에 수집 (실제 상품 수: ~1800개)

# GS25 API eventGbn1 파라미터 값
EVENT_TYPE_CODE_MAP: dict[str, str] = {
    "ONE_TO_ONE": "1+1",
    "TWO_TO_ONE": "2+1",
}

def _parse_response_json(raw_text: str) -> dict:
    """GS25 API 응답은 이중 직렬화된 JSON 문자열이다.

    응답 형식: "{\\"results\\":[...], \\"pagination\\":{...}}"
    outer JSON string을 먼저 파싱한 뒤 inner JSON object를 파싱한다.
    """
    outer: str = json.loads(raw_text)
    inner: dict = json.loads(outer)
    return inner


def _parse_products_from_json(
    data: dict,
    event_type: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """GS25 JSON 응답에서 상품 목록을 파싱해 반환한다.

    GS25 JSON 필드:
      goodsNm     : 상품명
      price       : 가격 (float)
      attFileNm   : 상품 이미지 URL
      eventTypeSp : {'code': 'ONE_TO_ONE'|'TWO_TO_ONE'|'GIFT', ...}
    """
    results = data.get("results", [])
    products: list[Product] = []

    for item in results:
        product_name = item.get("goodsNm", "").strip()
        price = int(item.get("price", 0))
        image_url = item.get("attFileNm", "")

        if not product_name:
            continue

        products.append(
            Product(
                store=STORE_NAME,
                name=product_name,
                price=price,
                event_type=event_type,
                category=infer_category(product_name),
                image_url=image_url,
                valid_from=valid_from,
                valid_to=valid_to,
            )
        )

    return products


async def _fetch_all_event_products(
    client: httpx.AsyncClient,
    event_type_code: str,
) -> dict:
    """GS25 AJAX 엔드포인트에 단일 GET 요청으로 해당 행사 유형 전체 상품을 반환한다.

    GS25 서버는 pageNo 파라미터를 무시하고 항상 첫 번째 페이지를 응답한다.
    pageSize를 충분히 크게 지정해 전체 상품을 한 번에 수집한다.
    """
    params = {
        "pageNo": "1",
        "pageSize": str(PAGE_SIZE),
        "eventGbn1": event_type_code,
    }
    request_headers = {
        "Referer": REFERER_URL,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    response = await client.get(AJAX_URL, params=params, headers=request_headers)
    response.raise_for_status()
    return _parse_response_json(response.text)


async def _collect_event_type_products(
    client: httpx.AsyncClient,
    event_type_code: str,
    event_type_label: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """특정 행사 유형의 전체 상품을 단일 요청으로 수집한다."""
    logger.info("GS25 행사유형=%s 전체 상품 요청 중 (pageSize=%d)", event_type_code, PAGE_SIZE)
    try:
        data = await _fetch_all_event_products(client, event_type_code)
    except httpx.HTTPError as error:
        logger.error("GS25 행사유형=%s 요청 실패: %s", event_type_code, error)
        return []

    total_results = data.get("pagination", {}).get("totalNumberOfResults", 0)
    products = _parse_products_from_json(data, event_type_label, valid_from, valid_to)
    logger.info(
        "GS25 행사유형=%s 수집 완료: %d개 (서버 전체 %d개)",
        event_type_code,
        len(products),
        total_results,
    )
    return products


async def fetch_products() -> list[Product]:
    """GS25 행사 상품 목록을 크롤링해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {"User-Agent": USER_AGENT}
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=False) as client:
            for event_type_code, event_type_label in EVENT_TYPE_CODE_MAP.items():
                products = await _collect_event_type_products(
                    client, event_type_code, event_type_label, valid_from, valid_to
                )
                all_products.extend(products)
                logger.info("GS25 행사유형=%s 수집 완료: %d개", event_type_code, len(products))
                await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    except Exception as error:
        logger.error("GS25 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    logger.info("GS25 전체 수집 완료: %d개", len(all_products))
    return all_products


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    async def _main() -> None:
        products = await fetch_products()
        print(f"수집된 상품 수: {len(products)}")
        for product in products[:5]:
            print(product)

    sys.exit(asyncio.run(_main()))
