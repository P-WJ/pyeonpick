import asyncio
import json
import logging
import random
from datetime import date, timedelta

import httpx

from crawler.domain.entities import Product

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

# GS25 eventTypeSp.code 값 → 행사 유형 레이블 매핑
# 실제 확인된 코드: ONE_TO_ONE, TWO_TO_ONE, GIFT
# eventGbn1 파라미터는 서버에서 실제로 필터링하지 않으므로,
# 전체를 한 번에 가져와 eventTypeSp.code로 직접 분류한다.
EVENT_TYPE_CODE_MAP: dict[str, str] = {
    "ONE_TO_ONE": "1+1",
    "TWO_TO_ONE": "2+1",
    "GIFT": "증정",
}

# 수집 대상 행사 유형 (할인·기타 제외)
COLLECTED_EVENT_TYPES: frozenset[str] = frozenset({"1+1", "2+1", "증정"})


def _parse_response_json(raw_text: str) -> dict:
    """GS25 API 응답은 이중 직렬화된 JSON 문자열이다.

    응답 형식: "{\\"results\\":[...], \\"pagination\\":{...}}"
    outer JSON string을 먼저 파싱한 뒤 inner JSON object를 파싱한다.
    """
    outer: str = json.loads(raw_text)
    inner: dict = json.loads(outer)
    return inner


def _resolve_event_type(item: dict) -> str:
    """상품 항목의 eventTypeSp.code를 행사 유형 레이블로 변환한다."""
    event_type_sp = item.get("eventTypeSp", {}) or {}
    code = event_type_sp.get("code", "")
    return EVENT_TYPE_CODE_MAP.get(code, "")


def _parse_products_from_json(
    data: dict,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """GS25 JSON 응답에서 수집 대상 행사 상품 목록을 파싱해 반환한다.

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
        event_type = _resolve_event_type(item)

        if not product_name:
            continue

        if event_type not in COLLECTED_EVENT_TYPES:
            continue

        products.append(
            Product(
                store=STORE_NAME,
                name=product_name,
                price=price,
                event_type=event_type,
                category="기타",
                image_url=image_url,
                valid_from=valid_from,
                valid_to=valid_to,
            )
        )

    return products


async def _fetch_all_products(client: httpx.AsyncClient) -> dict:
    """GS25 AJAX 엔드포인트에 단일 GET 요청으로 전체 상품을 반환한다.

    GS25 서버는 eventGbn1 파라미터를 실제로 필터링하지 않으므로
    파라미터 없이 전체를 한 번에 가져온 뒤 eventTypeSp.code로 분류한다.
    """
    params = {
        "pageNo": "1",
        "pageSize": str(PAGE_SIZE),
    }
    request_headers = {
        "Referer": REFERER_URL,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    response = await client.get(AJAX_URL, params=params, headers=request_headers)
    response.raise_for_status()
    return _parse_response_json(response.text)


async def fetch_products() -> list[Product]:
    """GS25 행사 상품 목록을 크롤링해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {"User-Agent": USER_AGENT}

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=False) as client:
            logger.info("GS25 전체 상품 단일 요청 중 (pageSize=%d)", PAGE_SIZE)
            try:
                data = await _fetch_all_products(client)
            except httpx.HTTPError as error:
                logger.error("GS25 전체 상품 요청 실패: %s", error)
                return []

            total_results = data.get("pagination", {}).get("totalNumberOfResults", 0)
            products = _parse_products_from_json(data, valid_from, valid_to)

            # 행사 유형별 통계 로깅
            type_counts: dict[str, int] = {}
            for product in products:
                type_counts[product.event_type] = type_counts.get(product.event_type, 0) + 1
            logger.info(
                "GS25 수집 완료: 서버 전체 %d개, 행사상품 %d개 (유형별: %s)",
                total_results,
                len(products),
                type_counts,
            )
            return products

    except Exception as error:
        logger.error("GS25 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)
        return []


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    async def _main() -> None:
        products = await fetch_products()
        print(f"수집된 상품 수: {len(products)}")
        for product in products[:5]:
            print(product)

    sys.exit(asyncio.run(_main()))
