"""웹 푸시 알림 발송 모듈.

pywebpush 라이브러리를 사용해 브라우저 푸시 알림을 발송한다.
VAPID 키는 환경변수에서 읽는다:
  VAPID_PRIVATE_KEY  — VAPID 비밀키 (npx web-push generate-vapid-keys로 생성)
  VAPID_SUBJECT      — mailto: 형식 연락처 (예: mailto:pwj1103@gmail.com)
"""
import json
import logging
import os

from crawler.domain.entities import Product
from crawler.infrastructure.repository import _get_supabase_client

logger = logging.getLogger(__name__)

SITE_URL = "https://pyeonpick.vercel.app"


def _get_all_push_subscriptions() -> list[dict]:
    """push_subscriptions 테이블에서 전체 구독 목록을 조회한다."""
    client = _get_supabase_client()
    result = (
        client.table("push_subscriptions")
        .select("endpoint, p256dh, auth, keywords, stores")
        .execute()
    )
    return result.data or []


def _matches_subscription(
    subscription: dict,
    products: list[Product],
) -> list[Product]:
    """구독 조건(편의점·키워드)에 맞는 상품을 반환한다."""
    stores = subscription.get("stores") or []
    keywords = subscription.get("keywords") or []

    def matches(product: Product) -> bool:
        if stores and product.store not in stores:
            return False
        if keywords:
            name_lower = product.name.lower()
            return any(kw.lower() in name_lower for kw in keywords)
        return True

    return [p for p in products if matches(p)]


def _build_push_payload(products: list[Product]) -> str:
    """웹 푸시 페이로드 JSON을 생성한다."""
    if len(products) == 1:
        body = f"{products[0].store} {products[0].name} ({products[0].event_type})"
    else:
        body = f"새로운 행사 상품 {len(products)}개가 등록됐어요!"

    return json.dumps({
        "title": "[편픽] 이번 달 행사 상품 알림",
        "body": body,
        "url": SITE_URL,
        "icon": f"{SITE_URL}/icon-192x192.png",
    })


def send_web_push_notifications(new_products: list[Product]) -> dict[str, int]:
    """웹 푸시 구독자 전체에게 알림을 발송하고 결과를 반환한다."""
    try:
        from pywebpush import WebPushException, webpush  # type: ignore
    except ImportError:
        logger.error(
            "pywebpush 패키지가 없습니다. `pip install pywebpush`로 설치하세요."
        )
        return {"sent": 0, "skipped": 0, "failed": 0}

    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    vapid_subject = os.environ.get("VAPID_SUBJECT", "mailto:pwj1103@gmail.com")

    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY 환경변수가 없어 웹 푸시를 건너뜁니다.")
        return {"sent": 0, "skipped": 0, "failed": 0}

    subscriptions = _get_all_push_subscriptions()
    if not subscriptions:
        logger.info("웹 푸시 구독자가 없습니다.")
        return {"sent": 0, "skipped": 0, "failed": 0}

    sent = skipped = failed = 0

    for subscription in subscriptions:
        matched = _matches_subscription(subscription, new_products)
        if not matched:
            skipped += 1
            continue

        payload = _build_push_payload(matched)
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": {
                        "p256dh": subscription["p256dh"],
                        "auth": subscription["auth"],
                    },
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_subject},
            )
            sent += 1
        except WebPushException as error:
            status = error.response.status_code if error.response else "unknown"
            if status == 410:
                # 구독 만료 — DB에서 삭제
                _delete_expired_subscription(subscription["endpoint"])
                logger.info("만료된 웹 푸시 구독 삭제: %s", subscription["endpoint"][:40])
            else:
                logger.error("웹 푸시 발송 실패 (HTTP %s): %s", status, error)
                failed += 1
        except Exception as error:
            logger.error("웹 푸시 발송 중 예외: %s", error)
            failed += 1

    logger.info(
        "웹 푸시 완료 — 발송 %d건 / 건너뜀 %d건 / 실패 %d건",
        sent, skipped, failed,
    )
    return {"sent": sent, "skipped": skipped, "failed": failed}


def _delete_expired_subscription(endpoint: str) -> None:
    """만료된 푸시 구독을 DB에서 삭제한다."""
    try:
        client = _get_supabase_client()
        client.table("push_subscriptions").delete().eq("endpoint", endpoint).execute()
    except Exception as error:
        logger.error("만료 구독 삭제 실패: %s", error)
