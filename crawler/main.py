"""크롤러 실행 진입점.

`python -m crawler.main` 으로 1회 실행한다.
반복 실행 스케줄은 GitHub Actions(`.github/workflows/crawl.yml`)가 담당한다.
"""
import asyncio
import logging
import sys

from crawler.use_cases.crawl_all import crawl_all_stores

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> int:
    """전체 편의점을 1회 크롤링하고, 실패한 편의점이 있으면 1을 반환한다."""
    results = asyncio.run(crawl_all_stores())

    failed = [result for result in results if result.error]
    for result in results:
        if result.error:
            logger.error("%s: 실패 — %s", result.store, result.error)
        else:
            logger.info("%s: %d개 저장 완료", result.store, len(result.products))

    if failed:
        logger.error("%d개 편의점 크롤링 실패", len(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
