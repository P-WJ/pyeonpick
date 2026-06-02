import logging
import os

from supabase import create_client, Client

from crawler.domain.entities import Product

logger = logging.getLogger(__name__)


def _get_supabase_client() -> Client:
    """환경변수에서 Supabase 클라이언트를 생성한다."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _product_to_row(product: Product) -> dict:
    """Product 엔티티를 DB 행 딕셔너리로 변환한다."""
    return {
        "store": product.store,
        "name": product.name,
        "price": product.price,
        "event_type": product.event_type,
        "category": product.category,
        "image_url": product.image_url,
        "valid_from": product.valid_from.isoformat(),
        "valid_to": product.valid_to.isoformat(),
    }


UPSERT_BATCH_SIZE = 500


def _deduplicate(products: list[Product]) -> list[Product]:
    """(store, name, valid_from) 기준으로 중복 제거한다."""
    seen: set[tuple[str, str, str]] = set()
    result: list[Product] = []
    for product in products:
        key = (product.store, product.name, product.valid_from.isoformat())
        if key not in seen:
            seen.add(key)
            result.append(product)
    return result


async def upsert_products(products: list[Product]) -> int:
    """products를 DB에 upsert하고 처리된 행 수를 반환한다.

    upsert 후 DB가 부여한 id를 각 Product 엔티티에 채워 넣는다.
    이 id는 알림 중복 발송 방지(notifications_sent 테이블)에 사용된다.
    """
    if not products:
        return 0

    unique_products = _deduplicate(products)
    client = _get_supabase_client()
    total = 0

    for i in range(0, len(unique_products), UPSERT_BATCH_SIZE):
        batch = unique_products[i : i + UPSERT_BATCH_SIZE]
        rows = [_product_to_row(product) for product in batch]
        result = (
            client.table("products")
            .upsert(rows, on_conflict="store,name,valid_from")
            .execute()
        )
        returned_rows: list[dict] = result.data or []
        count = len(returned_rows)
        total += count

        # upsert 결과에서 id를 Product 엔티티에 역주입한다
        id_by_key: dict[tuple[str, str, str], int] = {
            (row["store"], row["name"], row["valid_from"]): row["id"]
            for row in returned_rows
            if "id" in row
        }
        for product in batch:
            key = (product.store, product.name, product.valid_from.isoformat())
            if key in id_by_key:
                product.id = id_by_key[key]

    logger.info("%d개 상품 upsert 완료", total)
    return total
