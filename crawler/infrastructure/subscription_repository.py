"""구독 정보 및 알림 발송 이력 DB 접근 레이어."""
import logging
from datetime import datetime, timezone

from crawler.domain.entities import Subscription
from crawler.infrastructure.repository import _get_supabase_client

logger = logging.getLogger(__name__)


def _row_to_subscription(row: dict) -> Subscription:
    """DB 행 딕셔너리를 Subscription 엔티티로 변환한다."""
    return Subscription(
        id=row["id"],
        email=row["email"],
        keywords=row.get("keywords") or [],
        stores=row.get("stores") or [],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def get_active_subscriptions() -> list[Subscription]:
    """is_active=True인 구독 목록 전체를 조회한다."""
    client = _get_supabase_client()
    result = (
        client.table("subscriptions")
        .select("id, email, keywords, stores, created_at")
        .eq("is_active", True)
        .execute()
    )
    rows = result.data or []
    subscriptions = [_row_to_subscription(row) for row in rows]
    logger.info("활성 구독자 %d명 조회 완료", len(subscriptions))
    return subscriptions


def get_already_notified_product_ids(subscription_id: str) -> set[int]:
    """해당 구독자에게 이미 알림을 발송한 상품 ID 집합을 반환한다."""
    client = _get_supabase_client()
    result = (
        client.table("notifications_sent")
        .select("product_id")
        .eq("subscription_id", subscription_id)
        .execute()
    )
    rows = result.data or []
    return {row["product_id"] for row in rows}


def record_notifications_sent(subscription_id: str, product_ids: list[int]) -> None:
    """notifications_sent 테이블에 발송 이력을 기록한다.

    중복 키 충돌은 무시한다 (동일 구독자·상품에 대한 이중 기록 방지).
    """
    if not product_ids:
        return

    client = _get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "subscription_id": subscription_id,
            "product_id": product_id,
            "sent_at": now,
        }
        for product_id in product_ids
    ]
    client.table("notifications_sent").upsert(
        rows,
        on_conflict="subscription_id,product_id",
        ignore_duplicates=True,
    ).execute()
    logger.debug(
        "구독자 %s 발송 이력 %d건 기록 완료", subscription_id, len(product_ids)
    )
