import logging
from types import ModuleType

from datetime import timedelta

from crawler.domain.entities import CrawlResult, Product
from crawler.infrastructure.common import today_kst
from crawler.infrastructure.repository import (
    expire_products,
    fetch_active_products,
    fetch_existing_product_keys,
    upsert_products,
)
from crawler.infrastructure.ai_classifier import classify_products
from crawler.infrastructure.stores import cu, cspace, emart24, seven
from crawler.infrastructure.web_push_notifier import send_web_push_notifications

logger = logging.getLogger(__name__)

# gs25는 2026-08-26 기준 수집 대상에서 제외.
# 공식 행사상품 페이지(gs25.gsretail.com/products/event-goods)가 폐쇄되고
# 가맹점주용 www.gsretail.com/brand/gs25 로 301 리다이렉트되어 가져올 출처가 없다.
# 페이지가 복구되면 gs25를 이 목록에 다시 넣기만 하면 된다 (gs25.py는 보존).
STORE_MODULES: list[ModuleType] = [cu, seven, emart24, cspace]

# 실행 환경별로 매장을 나눠 돌릴 때 쓰는 키 (`python -m crawler.main --stores cu,emart24`).
# 세븐일레븐은 GitHub Actions(데이터센터 IP)에서 ConnectTimeout으로 차단되어
# 로컬 PC(가정용 IP)의 작업 스케줄러에서 수집한다 (scripts/crawl-seven-local.ps1).
STORE_MODULES_BY_KEY: dict[str, ModuleType] = {
    "cu": cu,
    "seven": seven,
    "emart24": emart24,
    "cspace": cspace,
}

# 이번 수집량이 기존 진행 중 상품의 이 비율보다 적으면 부분 실패로 보고 만료 처리를 건너뛴다.
# (씨스페이스처럼 일부 페이지만 끊기는 경우 멀쩡한 상품까지 내리지 않도록)
MIN_COLLECTED_RATIO_FOR_EXPIRE = 0.5


def expire_unseen_products(store_name: str, products: list[Product]) -> None:
    """이번 수집에 없는 진행 중 상품을 어제 날짜로 만료시킨다.

    행사가 월 중간에 끝났거나, 월초 수집이 지난달 목록을 가져온 경우를 정리한다.
    """
    today = today_kst()
    active = fetch_active_products(store_name, today)
    if len(products) < len(active) * MIN_COLLECTED_RATIO_FOR_EXPIRE:
        logger.warning(
            "%s: 수집 %d개가 진행 중 %d개의 %d%% 미만 — 부분 실패로 보고 만료 처리를 건너뜁니다",
            store_name, len(products), len(active), int(MIN_COLLECTED_RATIO_FOR_EXPIRE * 100),
        )
        return

    collected_names = {product.name for product in products}
    unseen_ids = [product_id for name, product_id in active.items() if name not in collected_names]
    if unseen_ids:
        expire_products(unseen_ids, today - timedelta(days=1))
    logger.info("%s: 이번 수집에 없는 진행 중 상품 %d개 만료 처리", store_name, len(unseen_ids))


async def crawl_all_stores(store_modules: list[ModuleType] = STORE_MODULES) -> list[CrawlResult]:
    """지정한 편의점(기본: 전체)을 순차 크롤링하고 AI로 카테고리 분류 후 DB에 저장한다.

    크롤링·저장 완료 후 웹 푸시 구독자에게 신규 상품 알림을 발송한다.
    """
    results: list[CrawlResult] = []

    # upsert 이전 시점의 DB 상태를 스냅샷해 둔다 — 이번 회차의 신규 상품 판별 기준
    try:
        existing_keys = fetch_existing_product_keys()
        logger.info("기존 상품 %d건 확인 — 이 중에 없는 상품만 알림 대상", len(existing_keys))
    except Exception as error:
        logger.error("기존 상품 조회 실패 — 이번 회차 알림을 건너뜁니다: %s", error)
        existing_keys = None

    for store_module in store_modules:
        store_name: str = store_module.STORE_NAME
        try:
            logger.info("%s 크롤링 시작", store_name)
            products = await store_module.fetch_products()
            if not products:
                # 매장 모듈은 요청 실패를 로그만 남기고 빈 목록을 돌려준다. 0개는 실패로 드러낸다.
                raise RuntimeError("수집된 상품이 0개 — 접속 차단 또는 페이지 구조 변경 의심")
            classify_products(products)
            await upsert_products(products)
            expire_unseen_products(store_name, products)
            results.append(CrawlResult(store=store_name, products=products))
            logger.info("%s 크롤링 완료: %d개", store_name, len(products))
        except Exception as error:
            logger.exception("%s 크롤링 실패: %s", store_name, error)
            results.append(CrawlResult(store=store_name, products=[], error=str(error)))

    # 모든 편의점 크롤링 완료 후 구독자 알림 발송 — 신규 상품에 한정
    all_products: list[Product] = [
        product
        for result in results
        for product in result.products
    ]

    if not all_products:
        logger.warning("수집된 상품이 없어 알림 발송을 건너뜁니다.")
        return results

    if existing_keys is None:
        return results

    new_products = [
        product
        for product in all_products
        if (product.store, product.name) not in existing_keys
    ]

    if not new_products:
        logger.info("신규 상품이 없어 알림 발송을 건너뜁니다. (수집 %d개)", len(all_products))
        return results

    logger.info(
        "웹 푸시 알림 발송 시작 — 수집 %d개 중 신규 %d개 대상",
        len(all_products), len(new_products),
    )
    push_result = send_web_push_notifications(new_products)
    logger.info(
        "웹 푸시 알림 발송 결과 — 발송 %d건 / 건너뜀 %d건 / 실패 %d건",
        push_result["sent"],
        push_result["skipped"],
        push_result["failed"],
    )

    return results
