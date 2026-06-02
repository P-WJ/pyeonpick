"""구독자 알림 발송 오케스트레이션.

파이프라인:
  1. 활성 구독자 전체 조회
  2. 각 구독자별 편의점·키워드 조건 매칭
  3. 이미 알림을 발송한 상품 제외
  4. 매칭 상품이 있으면 발송
  5. 발송 성공 시 이력 기록
"""
import logging

from crawler.domain.entities import NotifyResult, Product, Subscription
from crawler.infrastructure.notifier import create_sender
from crawler.infrastructure.subscription_repository import (
    get_active_subscriptions,
    get_already_notified_product_ids,
    record_notifications_sent,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 매칭 로직 (순수 함수 — 외부 의존성 없음)
# ──────────────────────────────────────────────

def find_matching_products(
    subscription: Subscription,
    products: list[Product],
) -> list[Product]:
    """구독 조건(편의점 + 키워드)에 맞는 상품을 반환한다.

    - stores가 비어있으면 모든 편의점 상품 포함
    - keywords가 비어있으면 모든 상품 포함
    - keywords가 있으면 상품명에 키워드 중 하나라도 포함되면 매칭 (대소문자 무시)
    """
    def matches_store(product: Product) -> bool:
        return not subscription.stores or product.store in subscription.stores

    def matches_keyword(product: Product) -> bool:
        if not subscription.keywords:
            return True
        product_name_lower = product.name.lower()
        return any(
            keyword.lower() in product_name_lower
            for keyword in subscription.keywords
        )

    return [p for p in products if matches_store(p) and matches_keyword(p)]


def exclude_already_notified(
    products: list[Product],
    already_notified_ids: set[int],
) -> list[Product]:
    """이미 알림을 발송한 상품을 목록에서 제외한다."""
    return [p for p in products if p.id is not None and p.id not in already_notified_ids]


# ──────────────────────────────────────────────
# 단일 구독자 처리
# ──────────────────────────────────────────────

def _process_single_subscription(
    subscription: Subscription,
    new_products: list[Product],
    sender,
) -> tuple[bool, bool]:
    """단일 구독자에 대해 매칭·중복 제거·발송·이력 기록을 수행한다.

    Returns:
        (sent, skipped) — 발송 성공 여부, 건너뜀 여부.
        발송 실패 시 (False, False) — 호출자가 failed_count를 증가시킨다.
    """
    # 1. 조건 매칭
    matched = find_matching_products(subscription, new_products)
    if not matched:
        logger.debug(
            "구독자 %s — 매칭 상품 없음 (건너뜀)", subscription.email
        )
        return False, True  # skipped

    # 2. 이미 알림 보낸 상품 제외
    already_notified_ids = get_already_notified_product_ids(subscription.id)
    new_matched = exclude_already_notified(matched, already_notified_ids)

    if not new_matched:
        logger.debug(
            "구독자 %s — 매칭 %d개 모두 기발송 (건너뜀)",
            subscription.email,
            len(matched),
        )
        return False, True  # skipped

    logger.info(
        "구독자 %s — 발송 대상 %d개 (매칭 %d개 중 기발송 %d개 제외)",
        subscription.email,
        len(new_matched),
        len(matched),
        len(matched) - len(new_matched),
    )

    # 3. 발송
    success = sender.send(subscription, new_matched)
    if not success:
        return False, False  # failed

    # 4. 발송 이력 기록
    product_ids = [p.id for p in new_matched if p.id is not None]
    record_notifications_sent(subscription.id, product_ids)

    return True, False  # sent


# ──────────────────────────────────────────────
# 메인 오케스트레이터
# ──────────────────────────────────────────────

def notify_subscribers(new_products: list[Product]) -> NotifyResult:
    """크롤링으로 수집된 신규 상품을 기반으로 구독자에게 알림을 발송한다.

    한 구독자 처리 중 오류가 발생해도 다음 구독자 처리를 계속 진행한다.
    """
    if not new_products:
        logger.info("신규 상품이 없어 알림 발송을 건너뜁니다.")
        return NotifyResult(
            total_subscriptions=0,
            sent_count=0,
            skipped_count=0,
            failed_count=0,
            errors=[],
        )

    # product.id가 없는 상품은 알림 중복 방지를 할 수 없으므로 경고
    products_without_id = [p for p in new_products if p.id is None]
    if products_without_id:
        logger.warning(
            "ID가 없는 상품 %d개 — 중복 발송 방지가 적용되지 않습니다: %s",
            len(products_without_id),
            [p.name for p in products_without_id[:5]],
        )

    subscriptions = get_active_subscriptions()
    if not subscriptions:
        logger.info("활성 구독자가 없어 알림 발송을 건너뜁니다.")
        return NotifyResult(
            total_subscriptions=0,
            sent_count=0,
            skipped_count=0,
            failed_count=0,
            errors=[],
        )

    sender = create_sender()
    sent_count = 0
    skipped_count = 0
    failed_count = 0
    errors: list[str] = []

    logger.info(
        "알림 발송 시작 — 활성 구독자 %d명, 신규 상품 %d개",
        len(subscriptions),
        len(new_products),
    )

    for subscription in subscriptions:
        try:
            sent, skipped = _process_single_subscription(
                subscription, new_products, sender
            )
            if sent:
                sent_count += 1
            elif skipped:
                skipped_count += 1
            else:
                failed_count += 1
                errors.append(
                    f"구독자 {subscription.email} 발송 실패 (발송 API 오류)"
                )
        except Exception as error:
            failed_count += 1
            error_message = (
                f"구독자 {subscription.email} 처리 중 예외 발생: {error}"
            )
            logger.exception(error_message)
            errors.append(error_message)

    logger.info(
        "알림 발송 완료 — 발송 %d건 / 건너뜀 %d건 / 실패 %d건",
        sent_count,
        skipped_count,
        failed_count,
    )

    if errors:
        logger.warning("발송 실패 목록:\n%s", "\n".join(errors))

    return NotifyResult(
        total_subscriptions=len(subscriptions),
        sent_count=sent_count,
        skipped_count=skipped_count,
        failed_count=failed_count,
        errors=errors,
    )
