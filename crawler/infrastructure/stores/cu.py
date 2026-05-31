import asyncio
import logging
import random
from datetime import date, timedelta

import httpx
from bs4 import BeautifulSoup

from crawler.domain.entities import Product
from crawler.infrastructure.common import infer_category, parse_price

logger = logging.getLogger(__name__)

STORE_NAME = "CU"
SLEEP_MIN = 1.0
SLEEP_MAX = 2.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
# CU 행사 상품은 AJAX POST로 HTML 조각을 반환한다
AJAX_URL = "https://cu.bgfretail.com/event/plusAjax.do"
REFERER_URL = "https://cu.bgfretail.com/event/plus.do?category=event&depth2=4&pageIndex=1"

def _parse_event_type(badge_element: BeautifulSoup | None) -> str:
    """badge div에서 행사 유형을 추출한다.

    CU HTML 구조:
      <div class="badge">
        <!-- [D] .badge > span .plus2 : 2+1 / .plus1 : 1+1 -->
        <span class="plus1">1+1</span>  <!-- 또는 plus2 -->
      </div>

    실제 확인된 클래스: plus1(1+1), plus2(2+1).
    """
    if badge_element is None:
        return "할인"
    if badge_element.select_one("span.plus1"):
        return "1+1"
    if badge_element.select_one("span.plus2"):
        return "2+1"
    return "할인"


def _parse_products_from_html(html: str, valid_from: date, valid_to: date) -> list[Product]:
    """CU AJAX 응답 HTML 조각에서 상품 목록을 파싱해 반환한다.

    CU HTML 구조 (plusAjax.do 응답):
      <ul>
        <li class="prod_list">
          <a class="prod_item" href="javascript:view(270);">
            <div class="prod_wrap">
              <div class="prod_img"><img src="..." /></div>
              <div class="prod_text">
                <div class="name"><p>상품명</p></div>
                <div class="price"><strong>900</strong><span class="won">원</span></div>
              </div>
            </div>
            <div class="badge">
              <span class="plus1">1+1</span>  <!-- 또는 plus2 for 2+1 -->
            </div>
          </a>
        </li>
      </ul>
    """
    soup = BeautifulSoup(html, "html.parser")
    products: list[Product] = []

    items = soup.select("li.prod_list")
    for item in items:
        name_tag = item.select_one("div.name p") or item.select_one("div.name")
        price_tag = item.select_one("div.price strong") or item.select_one("div.price")
        badge_tag = item.select_one("div.badge")
        image_tag = item.select_one("div.prod_img img")

        if name_tag is None or price_tag is None:
            continue

        product_name = name_tag.get_text(strip=True)
        price = parse_price(price_tag.get_text(strip=True))
        event_type = _parse_event_type(badge_tag)
        image_src = image_tag.get("src", "") if image_tag else ""
        image_url = f"https:{image_src}" if image_src.startswith("//") else image_src

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


def _has_more_pages(html: str) -> bool:
    """AJAX 응답에 더보기 버튼이 있으면 다음 페이지가 존재한다."""
    soup = BeautifulSoup(html, "html.parser")
    more_button = soup.select_one("div.prodListBtn")
    return more_button is not None


async def _fetch_page(client: httpx.AsyncClient, page_index: int) -> str:
    """CU AJAX 엔드포인트에 POST 요청해 HTML 조각을 반환한다."""
    data = {
        "pageIndex": str(page_index),
        "listType": "0",
        "searchCondition": "",
    }
    headers = {
        "Referer": REFERER_URL,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    response = await client.post(AJAX_URL, data=data, headers=headers)
    response.raise_for_status()
    return response.text


async def fetch_products() -> list[Product]:
    """CU 행사 상품 목록을 크롤링해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {"User-Agent": USER_AGENT}
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=True) as client:
            page_index = 1
            while True:
                logger.info("CU 페이지 %d 요청 중", page_index)
                try:
                    html = await _fetch_page(client, page_index)
                except httpx.HTTPError as error:
                    logger.error("CU 페이지 %d 요청 실패: %s", page_index, error)
                    break

                page_products = _parse_products_from_html(html, valid_from, valid_to)
                if not page_products:
                    logger.info("CU 페이지 %d에 상품 없음, 순회 종료", page_index)
                    break

                all_products.extend(page_products)
                logger.info("CU 페이지 %d: %d개 파싱", page_index, len(page_products))

                if not _has_more_pages(html):
                    break

                page_index += 1
                await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    except Exception as error:
        logger.error("CU 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    logger.info("CU 전체 수집 완료: %d개", len(all_products))
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
