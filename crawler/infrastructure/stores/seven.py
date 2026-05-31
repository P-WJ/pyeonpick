import asyncio
import logging
import random
from datetime import date, timedelta

import httpx
from bs4 import BeautifulSoup

from crawler.domain.entities import Product
from crawler.infrastructure.common import infer_category, parse_price

logger = logging.getLogger(__name__)

STORE_NAME = "세븐일레븐"
SLEEP_MIN = 1.0
SLEEP_MAX = 2.0
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
# 세븐일레븐 상품 목록 페이지 (pTab으로 행사 유형 구분)
BASE_URL = "https://www.7-eleven.co.kr/product/presentList.asp"
# 더보기 AJAX 엔드포인트
MORE_AJAX_URL = "https://www.7-eleven.co.kr/product/listMoreAjax.asp"

# pTab 값: 1=1+1, 2=2+1, 3=증정행사, 4=할인행사
P_TAB_MAP: dict[str, str] = {
    "1": "1+1",
    "2": "2+1",
    "3": "증정",
    "4": "할인",
}

MORE_LOAD_SIZE = 10  # 더보기 1회당 로드 개수

def _parse_event_type_from_tag(tag_list_element: BeautifulSoup | None) -> str:
    """ul.tag_list_01 에서 행사 유형 텍스트를 추출한다."""
    if tag_list_element is None:
        return "할인"
    tag_item = tag_list_element.find("li")
    if tag_item is None:
        return "할인"
    text = tag_item.get_text(strip=True)
    if "1+1" in text:
        return "1+1"
    if "2+1" in text:
        return "2+1"
    if "증정" in text:
        return "증정"
    return "할인"


def _parse_items_from_html(
    html: str,
    default_event_type: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """세븐일레븐 HTML 조각에서 상품 목록을 파싱해 반환한다.

    세븐일레븐 HTML 구조 (listUl 또는 listMoreAjax.asp 응답):
      <li>
        <ul class="tag_list_01">
          <li class="ico_tag_06">1+1</li>
        </ul>
        <div class="pic_product">
          <img src="/upload/product/..." alt="상품명" />
          <div class="infowrap">
            <div class="name">상품명</div>
            <div class="price"><span>2,000</span></div>
          </div>
        </div>
      </li>
    """
    soup = BeautifulSoup(html, "html.parser")
    products: list[Product] = []

    # listUl 내 li 또는 응답 자체의 li 목록
    list_container = soup.find("ul", id="listUl")
    if list_container:
        items = list_container.find_all("li", recursive=False)
    else:
        items = soup.find_all("li", recursive=False)

    for item in items:
        # 헤더성 li (img_list_tit_02 클래스 포함) 건너뜀
        if item.find(class_="img_list_tit_02"):
            continue

        tag_list = item.find("ul", class_="tag_list_01")
        pic_wrap = item.find("div", class_="pic_product")
        if pic_wrap is None:
            continue

        name_tag = pic_wrap.find("div", class_="name")
        price_tag = pic_wrap.find("div", class_="price")
        image_tag = pic_wrap.find("img")

        if name_tag is None or price_tag is None:
            continue

        product_name = name_tag.get_text(strip=True)
        price_span = price_tag.find("span")
        price = parse_price(price_span.get_text(strip=True) if price_span else price_tag.get_text(strip=True))
        event_type = _parse_event_type_from_tag(tag_list) or default_event_type
        image_src = image_tag.get("src", "") if image_tag else ""
        image_url = f"https://www.7-eleven.co.kr{image_src}" if image_src.startswith("/") else image_src

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


def _extract_total_count(html: str) -> int:
    """HTML에서 전체 상품 수를 추출한다."""
    soup = BeautifulSoup(html, "html.parser")
    total_input = soup.find("input", id="listCnt")
    if total_input:
        try:
            return int(total_input.get("value", "0"))
        except ValueError:
            pass
    # intTotalCount JS 변수에서 추출
    text = html
    idx = text.find("intTotalCount")
    if idx > 0:
        snippet = text[idx:idx+50]
        digits = "".join(c for c in snippet if c.isdigit())
        if digits:
            return int(digits)
    return 0


def _extract_list_page(html: str) -> int:
    """HTML에서 현재 listPage 값을 추출한다."""
    soup = BeautifulSoup(html, "html.parser")
    page_input = soup.find("input", id="listPage")
    if page_input:
        try:
            return int(page_input.get("value", "1"))
        except ValueError:
            pass
    return 1


async def _fetch_initial_page(client: httpx.AsyncClient, p_tab: str) -> str:
    """pTab 값으로 초기 상품 목록 페이지를 POST 요청해 반환한다."""
    data = {"pTab": p_tab}
    headers = {
        "Referer": BASE_URL,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    response = await client.post(BASE_URL, data=data, headers=headers)
    response.raise_for_status()
    return response.text


async def _fetch_more_items(
    client: httpx.AsyncClient,
    p_tab: str,
    list_page: int,
) -> str:
    """listMoreAjax.asp로 추가 상품을 로드해 HTML 조각을 반환한다."""
    data = {
        "intPageSize": str(MORE_LOAD_SIZE),
        "intCurrPage": str(list_page),
        "cateCd1": "",
        "cateCd2": "",
        "cateCd3": "",
        "pTab": p_tab,
    }
    headers = {
        "Referer": BASE_URL,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
    }
    response = await client.post(MORE_AJAX_URL, data=data, headers=headers)
    response.raise_for_status()
    return response.text


async def _collect_tab_products(
    client: httpx.AsyncClient,
    p_tab: str,
    event_type_label: str,
    valid_from: date,
    valid_to: date,
) -> list[Product]:
    """특정 탭(행사 유형)의 모든 상품을 수집한다."""
    logger.info("세븐일레븐 pTab=%s(%s) 초기 페이지 요청 중", p_tab, event_type_label)
    try:
        initial_html = await _fetch_initial_page(client, p_tab)
    except httpx.HTTPError as error:
        logger.error("세븐일레븐 pTab=%s 초기 페이지 요청 실패: %s", p_tab, error)
        return []

    all_products = _parse_items_from_html(initial_html, event_type_label, valid_from, valid_to)
    total_count = _extract_total_count(initial_html)
    logger.info("세븐일레븐 pTab=%s 전체 상품 수: %d, 현재: %d개", p_tab, total_count, len(all_products))

    # 더보기로 남은 상품 수집
    list_page = _extract_list_page(initial_html)
    while len(all_products) < total_count:
        await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
        logger.info("세븐일레븐 pTab=%s 더보기 요청 (listPage=%d)", p_tab, list_page)
        try:
            more_html = await _fetch_more_items(client, p_tab, list_page)
        except httpx.HTTPError as error:
            logger.error("세븐일레븐 pTab=%s 더보기 요청 실패: %s", p_tab, error)
            break

        more_products = _parse_items_from_html(more_html, event_type_label, valid_from, valid_to)
        if not more_products:
            logger.info("세븐일레븐 pTab=%s 더보기 상품 없음, 순회 종료", p_tab)
            break

        all_products.extend(more_products)
        list_page += 1

    return all_products


async def fetch_products() -> list[Product]:
    """세븐일레븐 행사 상품 목록을 크롤링해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {"User-Agent": USER_AGENT}
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=True) as client:
            for p_tab, event_type_label in P_TAB_MAP.items():
                products = await _collect_tab_products(
                    client, p_tab, event_type_label, valid_from, valid_to
                )
                all_products.extend(products)
                logger.info("세븐일레븐 pTab=%s 수집 완료: %d개", p_tab, len(products))
                await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    except Exception as error:
        logger.error("세븐일레븐 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    logger.info("세븐일레븐 전체 수집 완료: %d개", len(all_products))
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
