import logging
from types import ModuleType

from crawler.domain.entities import CrawlResult, Product
from crawler.infrastructure.repository import upsert_products
from crawler.infrastructure.ai_classifier import classify_products
from crawler.infrastructure.stores import cu, cspace, emart24, gs25, seven
from crawler.use_cases.notify_subscribers import notify_subscribers

logger = logging.getLogger(__name__)

STORE_MODULES: list[ModuleType] = [cu, gs25, seven, emart24, cspace]


async def crawl_all_stores() -> list[CrawlResult]:
    """모든 편의점을 순차 크롤링하고 AI로 카테고리 분류 후 DB에 저장한다.

    크롤링·저장 완료 후 활성 구독자에게 신규 상품 알림을 발송한다.
    """
    results: list[CrawlResult] = []

    for store_module in STORE_MODULES:
        store_name: str = store_module.STORE_NAME
        try:
            logger.info("%s 크롤링 시작", store_name)
            products = await store_module.fetch_products()
            classify_products(products)
            await upsert_products(products)
            results.append(CrawlResult(store=store_name, products=products))
            logger.info("%s 크롤링 완료: %d개", store_name, len(products))
        except Exception as error:
            logger.exception("%s 크롤링 실패: %s", store_name, error)
            results.append(CrawlResult(store=store_name, products=[], error=str(error)))

    # 모든 편의점 크롤링 완료 후 구독자 알림 발송
    all_products: list[Product] = [
        product
        for result in results
        for product in result.products
    ]

    if all_products:
        logger.info("구독자 알림 발송 시작 — 총 %d개 상품 대상", len(all_products))
        notify_result = notify_subscribers(all_products)
        logger.info(
            "구독자 알림 발송 결과 — 전체 구독자 %d명 / 발송 %d건 / 건너뜀 %d건 / 실패 %d건",
            notify_result.total_subscriptions,
            notify_result.sent_count,
            notify_result.skipped_count,
            notify_result.failed_count,
        )
    else:
        logger.warning("수집된 상품이 없어 구독자 알림 발송을 건너뜁니다.")

    return results
