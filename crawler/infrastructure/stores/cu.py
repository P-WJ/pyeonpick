import asyncio
import logging
import random
import re
from datetime import date, timedelta

import httpx
from bs4 import BeautifulSoup

from crawler.domain.entities import Product
from crawler.infrastructure.common import parse_price

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
# CU 상품 상세 페이지 URL
DETAIL_URL = "https://cu.bgfretail.com/product/view.do"

# CU 영양성분 테이블 레이블 → 딕셔너리 키 매핑
# 실제 HTML: <th>열량</th><td>250kcal</td> 형태
NUTRITION_LABEL_MAP: dict[str, str] = {
    "열량": "calories",
    "단백질": "protein",
    "지방": "fat",
    "탄수화물": "carbohydrates",
    "당류": "sugars",
    "나트륨": "sodium",
    "포화지방": "saturated_fat",
    "포화지방산": "saturated_fat",
    "트랜스지방": "trans_fat",
    "트랜스지방산": "trans_fat",
    "콜레스테롤": "cholesterol",
}

# 단위별 변환: 숫자만 추출하되 단위 보존이 필요한 항목
NUTRITION_UNIT_DIVISOR: dict[str, float] = {}  # 현재는 단위 그대로 사용

def _extract_product_code_from_href(href: str) -> str | None:
    """CU 상품 링크 href에서 상품 코드를 추출한다.

    CU HTML: href="javascript:view(270);" 형태.
    """
    match = re.search(r"view\((\d+)\)", href)
    return match.group(1) if match else None


def _parse_nutrition_value(raw_value: str, key: str) -> float | int | None:
    """영양성분 값 문자열에서 숫자를 추출한다.

    예: "250kcal" → 250, "5.0g" → 5.0, "400mg" → 400
    """
    digits_match = re.search(r"[\d.]+", raw_value.replace(",", ""))
    if digits_match is None:
        return None
    value_str = digits_match.group()
    try:
        value = float(value_str)
        # 정수로 표현 가능하면 int 반환 (calories, sodium, cholesterol)
        if key in ("calories", "sodium", "cholesterol", "trans_fat") and value == int(value):
            return int(value)
        return value
    except ValueError:
        return None


def _parse_nutrition_from_detail_html(html: str) -> dict | None:
    """CU 상품 상세 페이지 HTML에서 영양성분 딕셔너리를 파싱해 반환한다.

    CU 상세 페이지 영양성분 테이블 구조:
      <div class="nutrition">
        <table>
          <tbody>
            <tr>
              <th>1회 제공량</th>
              <td>1개(120g)</td>
            </tr>
            <tr>
              <th>열량</th>
              <td>250kcal</td>
            </tr>
            ...
          </tbody>
        </table>
      </div>
    영양성분 섹션이 없으면 None을 반환한다.
    """
    soup = BeautifulSoup(html, "html.parser")

    # 영양성분 테이블 탐색: class="nutrition" div 또는 th에 "열량" 텍스트 포함 테이블
    nutrition_table = soup.find("div", class_="nutrition")
    if nutrition_table is None:
        # 폴백: 테이블에서 "열량" th 탐색
        for table in soup.find_all("table"):
            if table.find("th", string=re.compile("열량")):
                nutrition_table = table
                break

    if nutrition_table is None:
        return None

    nutrition: dict = {}
    rows = nutrition_table.find_all("tr")
    for row in rows:
        header = row.find("th")
        cell = row.find("td")
        if header is None or cell is None:
            continue

        label = header.get_text(strip=True)
        raw_value = cell.get_text(strip=True)

        if "제공량" in label or "serving" in label.lower():
            if raw_value:
                nutrition["serving_size"] = raw_value
            continue

        key = NUTRITION_LABEL_MAP.get(label)
        if key is None:
            continue

        parsed_value = _parse_nutrition_value(raw_value, key)
        if parsed_value is not None:
            nutrition[key] = parsed_value

    return nutrition if nutrition else None


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


def _parse_products_from_html(html: str, valid_from: date, valid_to: date) -> list[tuple[Product, str | None]]:
    """CU AJAX 응답 HTML 조각에서 상품 목록과 상품 코드를 파싱해 반환한다.

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

    반환값: (Product, 상품코드_또는_None) 튜플 리스트.
    상품 코드는 영양성분 상세 페이지 요청에 사용한다.
    """
    soup = BeautifulSoup(html, "html.parser")
    product_tuples: list[tuple[Product, str | None]] = []

    items = soup.select("li.prod_list")
    for item in items:
        link_tag = item.select_one("a.prod_item")
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

        href = link_tag.get("href", "") if link_tag else ""
        product_code = _extract_product_code_from_href(str(href))

        if not product_name:
            continue

        product_tuples.append((
            Product(
                store=STORE_NAME,
                name=product_name,
                price=price,
                event_type=event_type,
                category="기타",
                image_url=image_url,
                valid_from=valid_from,
                valid_to=valid_to,
                nutrition=None,
            ),
            product_code,
        ))

    return product_tuples


def _has_more_pages(html: str) -> bool:
    """AJAX 응답에 더보기 버튼이 있으면 다음 페이지가 존재한다."""
    soup = BeautifulSoup(html, "html.parser")
    more_button = soup.select_one("div.prodListBtn")
    return more_button is not None


async def _fetch_product_detail(client: httpx.AsyncClient, product_code: str) -> str:
    """CU 상품 상세 페이지 HTML을 반환한다.

    CU 상세 페이지는 gdIdx 파라미터를 form POST로 전송한다.
    """
    data = {
        "category": "event",
        "gdIdx": product_code,
    }
    headers = {
        "Referer": REFERER_URL,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    response = await client.post(DETAIL_URL, data=data, headers=headers)
    response.raise_for_status()
    return response.text


async def _fetch_nutrition(
    client: httpx.AsyncClient,
    product_code: str,
) -> dict | None:
    """상품 상세 페이지에서 영양성분을 가져와 반환한다. 실패 시 None 반환."""
    try:
        html = await _fetch_product_detail(client, product_code)
        return _parse_nutrition_from_detail_html(html)
    except httpx.HTTPError as error:
        logger.warning("CU 상품코드=%s 상세 페이지 요청 실패: %s", product_code, error)
        return None


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


async def _collect_all_product_tuples(
    client: httpx.AsyncClient,
    valid_from: date,
    valid_to: date,
) -> list[tuple[Product, str | None]]:
    """CU 행사 상품 목록 전체를 페이지 순회하며 수집한다."""
    all_tuples: list[tuple[Product, str | None]] = []
    page_index = 1

    while True:
        logger.info("CU 페이지 %d 요청 중", page_index)
        try:
            html = await _fetch_page(client, page_index)
        except httpx.HTTPError as error:
            logger.error("CU 페이지 %d 요청 실패: %s", page_index, error)
            break

        page_tuples = _parse_products_from_html(html, valid_from, valid_to)
        if not page_tuples:
            logger.info("CU 페이지 %d에 상품 없음, 순회 종료", page_index)
            break

        all_tuples.extend(page_tuples)
        logger.info("CU 페이지 %d: %d개 파싱", page_index, len(page_tuples))

        if not _has_more_pages(html):
            break

        page_index += 1
        await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

    return all_tuples


async def _enrich_with_nutrition(
    client: httpx.AsyncClient,
    product_tuples: list[tuple[Product, str | None]],
) -> list[Product]:
    """각 상품의 상세 페이지에서 영양성분을 수집해 Product에 반영한다.

    상품 코드가 없거나 요청 실패 시 nutrition=None으로 유지한다.
    상품마다 1~2초 sleep을 적용한다.
    """
    products: list[Product] = []
    for index, (product, product_code) in enumerate(product_tuples):
        if product_code is None:
            products.append(product)
            continue

        if index > 0:
            await asyncio.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))

        nutrition = await _fetch_nutrition(client, product_code)
        product.nutrition = nutrition
        if nutrition:
            logger.debug(
                "CU 상품코드=%s 영양성분 수집 완료: %s",
                product_code,
                list(nutrition.keys()),
            )
        products.append(product)

    return products


async def fetch_products() -> list[Product]:
    """CU 행사 상품 목록을 크롤링하고 영양성분을 수집해 반환한다."""
    valid_from = date.today()
    valid_to = valid_from + timedelta(days=6)

    request_headers = {"User-Agent": USER_AGENT}
    all_products: list[Product] = []

    try:
        async with httpx.AsyncClient(headers=request_headers, timeout=30.0, follow_redirects=True) as client:
            product_tuples = await _collect_all_product_tuples(client, valid_from, valid_to)
            logger.info("CU 목록 수집 완료: %d개, 영양성분 수집 시작", len(product_tuples))
            all_products = await _enrich_with_nutrition(client, product_tuples)

    except Exception as error:
        logger.error("CU 크롤링 중 예기치 않은 오류: %s", error, exc_info=True)

    nutrition_count = sum(1 for p in all_products if p.nutrition is not None)
    logger.info(
        "CU 전체 수집 완료: %d개 (영양성분 있음: %d개)",
        len(all_products),
        nutrition_count,
    )
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
