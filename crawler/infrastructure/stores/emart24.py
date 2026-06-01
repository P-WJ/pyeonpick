import asyncio
import logging
import math
import random
import re
from datetime import date, timedelta

import httpx
from bs4 import BeautifulSoup

from crawler.domain.entities import Product
from crawler.infrastructure.common import parse_price

logger = logging.getLogger(__name__)

STORE_NAME = "이마트24"
SLEEP_MIN = 1.0
SLEEP_MAX = 2.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
BASE_URL = "https://www.emart24.co.kr/goods/event"
PAGE_SIZE = 20  # 이마트24 페이지당 상품 수

# 이마트24 행사 유형 클래스명 매핑
# <span class="onepl floatR">1 + 1</span>
# <span class="twopl floatR">2 + 1</span>
# <span class="tripl floatR">3 + 1</span>
# <span class="gola floatR">할인</span>
# <span class="sale floatR">세일</span>
EVENT_CLASS_MAP: dict[str, str] = {
    "onepl": "1+1",
    "twopl": "2+1",
    "tripl": "3+1",
    "gola": "할인",
    "sale": "할인",
}


def _parse_event_type(item_tit_element: BeautifulSoup | None) -> str:
    """itemTit div에서 행사 유형을 추출한다.

    이마트24 HTML 구조:
      <div class="itemTit">
        <span class="floatL" style="opacity: 0;">NEW</span>
        <span class="onepl floatR">1 + 1</span>  <!-- onepl | twopl | gola -->
      </div>
    """
    if item_tit_element is None:
        return "할인"
    for class_name, event_type in EVENT_CLASS_MAP.items():
        if item_tit_element.find(class_=class_name):
            return event_type
    return "할인"


def _has_items_on_page(html: str) -> bool:
    """페이지에 itemWrap 요소가 하나라도 있으면 True를 반환한다.

    필터 적용 후 1+1·2+1 상품이 없더라도 할인 상품이 있으면 페이지는
    비어 있지 않으므로, 실제 마지막 페이지 도달 여부를 판단하는 데 사용한다.
    """
    soup = BeautifulSoup(html, "html.parser")
    return bool(soup.find("div", class_="itemWrap"))


def _parse_products_from_html(html: str, valid_from: date, valid_to: date) -> list[Product]:
    """이마트24 HTML에서 1+1·2+1·3+1 행사 상품만 파싱해 반환한다.

    이마트24 HTML 구조:
      <div class="itemWrap">
        <div class="itemTit">
          <span class="floatL" style="opacity: 0;">NEW</span>
          <span class="onepl floatR">1 + 1</span>
        </div>
        <div class="itemSpImg">
          <img src="https://msave.emart24.co.kr/..." alt="" />
        </div>
        <span class="itemLine"></span>
        <div class="itemTxtWrap">
          <div class="itemtitle">
            <p><a href="#none">상품명</a></p>
          </div>
          <span>
            <a class="price" href="#none">2,000 원</a>
          </span>
        </div>
      </div>
    """
    soup = BeautifulSoup(html, "html.parser")
    products: list[Product] = []

    items = soup.find_all("div", class_="itemWrap")
    for item in items:
        item_tit = item.find("div", class_="itemTit")
        item_txt = item.find("div", class_="itemTxtWrap")
        image_tag = item.find("div", class_="itemSpImg")

        if item_txt is None:
            continue

        name_tag = item_txt.find("div", class_="itemtitle")
        price_tag = item_txt.find("a", class_="price")

        if name_tag is None or price_tag is None:
            continue

        product_name = name_tag.get_text(strip=True)
        price = parse_price(price_tag.get_text(strip=True))
        event_type = _parse_event_type(item_tit)
        img = image_tag.find("img") if image_tag else None
        image_url = img.get("src", "") if img else ""

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


def _extract_total_pages(html: str) -> int:
    """인라인 스크립트의 totalCount / pageLength 값으로 전체 페이지 수를 계산한다.

    이마트24는 페이지네이션 UI에 1~10만 렌더링하고 마지막 버튼이 없으므로,
    서버가 script 블록에 주입하는 변수를 파싱해 정확한 총 페이지 수를 구한다.

    HTML 예시:
      <script>
        const totalCount = "2849";
        const pageLength = "20";
      </script>
    """
    total_count_match = re.search(r'const\s+totalCount\s*=\s*"(\d+)"', html)
    page_length_match = re.search(r'const\s+pageLength\s*=\s*"(\d+)"', html)

    if total_count_match and page_length_match:
        total_count = int(total_count_match.group(1))
        page_length = int(page_length_match.group(1))
        if page_length > 0:
            return math.ceil(total_count / page_length)

    # 폴백: 페이지네이션 링크에서 최대값 추출
    logger.warning("이마트24 totalCount 스크립트 파싱 실패, 링크에서 폴백 시도")
    soup = BeautifulSoup(html, "html.parser")
    page_nav = soup.find("ul", class_="pageNation")
    if page_nav is None:
        return 1
    max_page = 1
    for link in page_nav.find_all("a"):
        href = link.get("href", "")
        if "page=" in href:
            try:
                page_num = int(href.split("page=")[1].split("&")[0])
                max_page = max(max_page, page_num)
            except (ValueError, IndexError):
                pass
    return max_page


async def _fetch_page(client: httpx.AsyncClient, page_index: int) -> str:
    """단일 페이지 HTML을 요청해 반환한다."""
    params = {
        "search": "",
        "page": str(page_index),
        "category_seq": "",
        "align": "",
    }
    response = await client.get(BASE_URL, params=params)
    response.raise_for_status()
    return response.text


async def fetch_products() -> list[Product]:
    """이마트24 행사 상품 목록을 크롤링해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=True) as client:
            logger.info("이마트24 1페이지 요청 중")
            try:
                first_html = await _fetch_page(client, 1)
            except httpx.HTTPError as error:
                logger.error("이마트24 1페이지 요청 실패: %s", error)
                return all_products

            page_products = _parse_products_from_html(first_html, valid_from, valid_to)
            all_products.extend(page_products)
            logger.info("이마트24 1페이지: %d개 파싱", len(page_products))

            total_pages = _extract_total_pages(first_html)
            logger.info("이마트24 전체 %d 페이지", total_pages)

            for page_index in range(2, total_pages + 1):
                await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
                logger.info("이마트24 페이지 %d/%d 요청 중", page_index, total_pages)
                try:
                    html = await _fetch_page(client, page_index)
                except httpx.HTTPError as error:
                    logger.error("이마트24 페이지 %d 요청 실패: %s", page_index, error)
                    break

                if not _has_items_on_page(html):
                    logger.info("이마트24 페이지 %d에 상품 없음, 순회 종료", page_index)
                    break

                page_products = _parse_products_from_html(html, valid_from, valid_to)
                all_products.extend(page_products)
                logger.info("이마트24 페이지 %d: %d개 파싱 (1+1·2+1·3+1 기준)", page_index, len(page_products))

    except Exception as error:
        logger.error("이마트24 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    logger.info("이마트24 전체 수집 완료: %d개", len(all_products))
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
