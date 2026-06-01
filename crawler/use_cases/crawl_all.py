import logging
from types import ModuleType

from crawler.domain.entities import CrawlResult
from crawler.infrastructure.repository import upsert_products
from crawler.infrastructure.ai_classifier import classify_products
from crawler.infrastructure.stores import cu, cspace, emart24, gs25, seven

logger = logging.getLogger(__name__)

STORE_MODULES: list[ModuleType] = [cu, gs25, seven, emart24, cspace]


async def crawl_all_stores() -> list[CrawlResult]:
    """모든 편의점을 순차 크롤링하고 AI로 카테고리 분류 후 DB에 저장한다."""
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

    return results
