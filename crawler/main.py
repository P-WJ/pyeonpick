import asyncio
import logging
import os

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from crawler.use_cases.crawl_all import crawl_all_stores

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

CRAWL_HOUR = int(os.getenv("CRAWL_HOUR", "3"))
CRAWL_MINUTE = int(os.getenv("CRAWL_MINUTE", "0"))
CRAWL_DAYS = os.getenv("CRAWL_DAYS", "1,2")


def run_crawl() -> None:
    """크롤링 작업을 동기 컨텍스트에서 실행한다."""
    results = asyncio.run(crawl_all_stores())
    for result in results:
        if result.succeeded:
            logger.info("%s: %d개 저장 완료", result.store, len(result.products))
        else:
            logger.error("%s: 실패 — %s", result.store, result.error)


if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone="Asia/Seoul")
    scheduler.add_job(
        run_crawl,
        trigger=CronTrigger(day=CRAWL_DAYS, hour=CRAWL_HOUR, minute=CRAWL_MINUTE),
    )
    logger.info("스케줄러 시작 — 매월 %s일 %02d:%02d KST 실행", CRAWL_DAYS, CRAWL_HOUR, CRAWL_MINUTE)
    try:
        scheduler.start()
    except KeyboardInterrupt:
        logger.info("스케줄러 종료")
