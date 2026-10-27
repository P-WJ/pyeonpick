"""크롤러 실행 진입점.

`python -m crawler.main` 으로 전체 편의점을 1회 실행한다.
`python -m crawler.main --stores seven` 처럼 일부 편의점만 실행할 수 있다.
반복 실행 스케줄은 GitHub Actions(`.github/workflows/crawl.yml`)가 담당한다.
"""
import argparse
import asyncio
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

# 로컬 실행용. CI는 환경변수를 secrets로 넣으므로 파일이 없어도 된다.
load_dotenv(Path(__file__).parent / ".env")

from crawler.use_cases.crawl_all import STORE_MODULES, STORE_MODULES_BY_KEY, crawl_all_stores

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def parse_store_modules(argv: list[str]) -> list:
    """--stores 인자(쉼표 구분 키)를 편의점 모듈 목록으로 바꾼다. 없으면 전체."""
    parser = argparse.ArgumentParser(description="편의점 행사상품 크롤러")
    parser.add_argument(
        "--stores",
        help=f"실행할 편의점 키, 쉼표 구분 ({', '.join(STORE_MODULES_BY_KEY)})",
    )
    args = parser.parse_args(argv)
    if not args.stores:
        return STORE_MODULES

    keys = [key.strip() for key in args.stores.split(",") if key.strip()]
    unknown = [key for key in keys if key not in STORE_MODULES_BY_KEY]
    if unknown:
        parser.error(f"알 수 없는 편의점 키: {', '.join(unknown)}")
    return [STORE_MODULES_BY_KEY[key] for key in keys]


def main() -> int:
    """편의점을 1회 크롤링하고, 실패한 편의점이 있으면 1을 반환한다."""
    store_modules = parse_store_modules(sys.argv[1:])
    results = asyncio.run(crawl_all_stores(store_modules))

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
