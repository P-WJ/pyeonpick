import asyncio
import logging
import random
from datetime import date

import httpx
from bs4 import BeautifulSoup

from crawler.domain.entities import Product
from crawler.infrastructure.common import parse_price, current_month_range

logger = logging.getLogger(__name__)

STORE_NAME = "씨스페이스"
SLEEP_MIN = 1.0
SLEEP_MAX = 2.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
BASE_URL = "https://www.cspace.co.kr"
PRODUCT_PAGE_PATH = "/service/product.html"

# 씨스페이스 카테고리 코드 → 행사 유형 매핑
# 00030000: 1+1상품, 00040000: 2+1상품, 00050000: 증정(현재 상품 없음), 00060000: 할인
EVENT_CATEGORY_MAP: dict[str, str] = {
    "00030000000000000000": "1+1",
    "00040000000000000000": "2+1",
    "00060000000000000000": "할인",
}

def _get_total_pages(soup: BeautifulSoup) -> int:
    """페이지 select 태그에서 전체 페이지 수를 반환한다.

    씨스페이스 페이지네이션 구조:
      <select id="page" onChange="pageGo(this.value);">
        <option value="...?cpage=1&...">1</option>
        ...
        <option value="...?cpage=N&...">N</option>
      </select>
    """
    page_select = soup.select_one("select#page")
    if page_select is None:
        return 1
    options = page_select.select("option")
    return len(options) if options else 1


def _parse_products_from_html(
    html: str,
    event_type: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """씨스페이스 상품 페이지 HTML에서 행사 상품 목록을 파싱해 반환한다.

    씨스페이스 HTML 구조 (product-list):
      <div class="product-list">
        <ul>
          <li class="onePlus" 00030000000000000000="">
            <div>
              <span class="img"><img src="/program_file/.../image.jpg" /></span>
            </div>
            <dl>
              <dt>상품명</dt>
              <dd>2,200원</dd>
            </dl>
          </li>
        </ul>
      </div>
    """
    soup = BeautifulSoup(html, "html.parser")
    products: list[Product] = []

    product_list = soup.select_one(".product-list")
    if product_list is None:
        return products

    items = product_list.select("li")
    for item in items:
        name_tag = item.select_one("dt")
        price_tag = item.select_one("dd")
        image_tag = item.select_one("img")

        if name_tag is None or price_tag is None:
            continue

        product_name = name_tag.get_text(strip=True)
        price = parse_price(price_tag.get_text(strip=True))
        image_src = image_tag.get("src", "") if image_tag else ""
        image_url = f"{BASE_URL}{image_src}" if image_src.startswith("/") else image_src

        if not product_name:
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


async def _fetch_page(
    client: httpx.AsyncClient,
    category_code: str,
    page_index: int,
) -> str:
    """씨스페이스 상품 목록 페이지 HTML을 반환한다."""
    params = {
        "prod_name_s": "",
        "category": category_code,
        "id_position_move": "calSelId",
        "cpage": str(page_index),
        "spage": "1",
    }
    response = await client.get(BASE_URL + PRODUCT_PAGE_PATH, params=params)
    response.raise_for_status()
    return response.content.decode("utf-8", errors="replace")


async def _collect_category_products(
    client: httpx.AsyncClient,
    category_code: str,
    event_type: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """특정 행사 카테고리의 전체 페이지를 순회하며 상품을 수집한다."""
    all_products: list[Product] = []

    logger.info("씨스페이스 카테고리=%s(%s) 1페이지 요청 중", category_code, event_type)
    try:
        first_page_html = await _fetch_page(client, category_code, 1)
    except httpx.HTTPError as error:
        logger.error(
            "씨스페이스 카테고리=%s 1페이지 요청 실패: %s",
            category_code,
            error,
        )
        return all_products

    soup = BeautifulSoup(first_page_html, "html.parser")
    total_pages = _get_total_pages(soup)
    logger.info(
        "씨스페이스 카테고리=%s(%s) 전체 %d 페이지",
        category_code,
        event_type,
        total_pages,
    )

    page_products = _parse_products_from_html(first_page_html, event_type, valid_from, valid_to)
    all_products.extend(page_products)

    for page_index in range(2, total_pages + 1):
        await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
        logger.info(
            "씨스페이스 카테고리=%s(%s) 페이지 %d/%d 요청 중",
            category_code,
            event_type,
            page_index,
            total_pages,
        )
        try:
            html = await _fetch_page(client, category_code, page_index)
        except httpx.HTTPError as error:
            logger.error(
                "씨스페이스 카테고리=%s 페이지 %d 요청 실패: %s",
                category_code,
                page_index,
                error,
            )
            break

        page_products = _parse_products_from_html(html, event_type, valid_from, valid_to)
        if not page_products:
            logger.info(
                "씨스페이스 카테고리=%s 페이지 %d에 상품 없음, 순회 종료",
                category_code,
                page_index,
            )
            break

        all_products.extend(page_products)

    return all_products


async def fetch_products() -> list[Product]:
    """씨스페이스 행사 상품 목록을 크롤링해 반환한다."""
    valid_from, valid_to = current_month_range()

    request_headers = {"User-Agent": USER_AGENT}
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(
            headers=request_headers,
            timeout=30.0,
            follow_redirects=True,
        ) as client:
            for category_code, event_type in EVENT_CATEGORY_MAP.items():
                products = await _collect_category_products(
                    client,
                    category_code,
                    event_type,
                    valid_from,
                    valid_to,
                )
                all_products.extend(products)
                logger.info(
                    "씨스페이스 카테고리=%s(%s) 수집 완료: %d개",
                    category_code,
                    event_type,
                    len(products),
                )
                await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    except Exception as error:
        logger.error("씨스페이스 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    logger.info("씨스페이스 전체 수집 완료: %d개", len(all_products))
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
