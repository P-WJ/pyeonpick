"""알림 발송 어댑터.

현재 구현체: ResendEmailSender (Resend 이메일 API)
전환 예정: KakaoAlimtalkSender (카카오 알림톡)

카카오 알림톡으로 교체 시 KakaoAlimtalkSender만 구현하고
notify_subscribers.py의 sender 생성 부분만 교체하면 된다.
"""
import logging
import os
from typing import Protocol

import httpx

from crawler.domain.entities import Product, Subscription

logger = logging.getLogger(__name__)

# .env 에 반드시 추가 필요:
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

RESEND_API_URL = "https://api.resend.com/emails"
SENDER_EMAIL = "편픽 <noreply@pyeonpick.com>"
EMAIL_SUBJECT = "[편픽] 이번 달 행사 상품 알림"

EVENT_TYPE_LABELS: dict[str, str] = {
    "1+1": "1+1",
    "2+1": "2+1",
    "3+1": "3+1",
    "할인": "할인",
    "증정": "증정",
}


class NotificationSender(Protocol):
    """알림 발송 어댑터 인터페이스."""

    def send(self, subscription: Subscription, products: list[Product]) -> bool:
        """알림을 발송하고 성공 여부를 반환한다."""
        ...


# ──────────────────────────────────────────────
# Resend 이메일 구현체 (현재 임시 운영)
# ──────────────────────────────────────────────

def _build_product_rows_html(products: list[Product]) -> str:
    """상품 목록을 HTML 테이블 행으로 변환한다."""
    rows = []
    for product in products:
        event_label = EVENT_TYPE_LABELS.get(product.event_type, product.event_type)
        price_text = f"{product.price:,}원" if product.price > 0 else "가격 미공개"
        rows.append(
            f"<tr>"
            f'<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">'
            f'  <img src="{product.image_url}" alt="{product.name}" '
            f'       width="48" height="48" style="object-fit:cover;border-radius:6px;">'
            f"</td>"
            f'<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">'
            f"  <strong>{product.name}</strong><br>"
            f'  <span style="color:#666;font-size:13px;">{product.store}</span>'
            f"</td>"
            f'<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#e53e3e;font-weight:bold;">'
            f"  {event_label}"
            f"</td>"
            f'<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">'
            f"  {price_text}"
            f"</td>"
            f"</tr>"
        )
    return "\n".join(rows)


def _build_subscription_summary(subscription: Subscription) -> str:
    """구독 조건 요약 텍스트를 생성한다."""
    parts = []
    if subscription.stores:
        parts.append(f"편의점: {', '.join(subscription.stores)}")
    else:
        parts.append("편의점: 전체")
    if subscription.keywords:
        parts.append(f"키워드: {', '.join(subscription.keywords)}")
    else:
        parts.append("키워드: 전체 상품")
    return " · ".join(parts)


def _build_email_html(subscription: Subscription, products: list[Product]) -> str:
    """이메일 HTML 본문을 생성한다."""
    product_rows = _build_product_rows_html(products)
    subscription_summary = _build_subscription_summary(subscription)
    product_count = len(products)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- 헤더 -->
          <tr>
            <td style="background:#6c4cf1;padding:28px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">
                편픽 · 이번 달 행사 상품 알림
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                {subscription_summary}
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;color:#333;font-size:15px;">
                안녕하세요! 구독하신 조건에 맞는
                <strong>신규 행사 상품 {product_count}개</strong>를 알려드립니다.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9f9f9;">
                    <th style="padding:10px 12px;text-align:left;font-size:13px;color:#888;font-weight:600;"></th>
                    <th style="padding:10px 12px;text-align:left;font-size:13px;color:#888;font-weight:600;">상품명</th>
                    <th style="padding:10px 12px;text-align:left;font-size:13px;color:#888;font-weight:600;">행사</th>
                    <th style="padding:10px 12px;text-align:left;font-size:13px;color:#888;font-weight:600;">가격</th>
                  </tr>
                </thead>
                <tbody>
                  {product_rows}
                </tbody>
              </table>

              <div style="margin-top:24px;text-align:center;">
                <a href="https://pyeonpick.vercel.app"
                   style="display:inline-block;padding:12px 28px;background:#6c4cf1;
                          color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  편픽에서 전체 보기
                </a>
              </div>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                이 메일은 편픽 행사 상품 알림 구독자에게 발송됩니다.<br>
                구독 해제를 원하시면
                <a href="https://pyeonpick.vercel.app/notifications?email={subscription.email}"
                   style="color:#6c4cf1;">여기</a>를 클릭하세요.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


class ResendEmailSender:
    """Resend API를 사용한 이메일 발송 구현체 (임시 — 카카오 알림톡 전환 예정)."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("RESEND_API_KEY", "")
        if not self._api_key:
            logger.warning(
                "RESEND_API_KEY 환경변수가 설정되지 않았습니다. "
                "crawler/.env 파일에 RESEND_API_KEY=re_xxx 형태로 추가하세요."
            )

    def send(self, subscription: Subscription, products: list[Product]) -> bool:
        """Resend API로 행사 상품 알림 이메일을 발송한다.

        Returns:
            발송 성공 시 True, 실패 시 False.
        """
        if not self._api_key:
            logger.error(
                "이메일 발송 실패 — RESEND_API_KEY가 없습니다: 수신자 %s",
                subscription.email,
            )
            return False

        html_body = _build_email_html(subscription, products)

        try:
            response = httpx.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": SENDER_EMAIL,
                    "to": [subscription.email],
                    "subject": EMAIL_SUBJECT,
                    "html": html_body,
                },
                timeout=15,
            )
            if response.status_code in (200, 201):
                logger.info(
                    "이메일 발송 성공: %s (상품 %d개)",
                    subscription.email,
                    len(products),
                )
                return True

            logger.error(
                "이메일 발송 실패: %s — HTTP %d: %s",
                subscription.email,
                response.status_code,
                response.text,
            )
            return False

        except httpx.TimeoutException:
            logger.error(
                "이메일 발송 타임아웃: %s — Resend API 응답 없음", subscription.email
            )
            return False
        except httpx.RequestError as error:
            logger.error(
                "이메일 발송 네트워크 오류: %s — %s", subscription.email, error
            )
            return False


# ──────────────────────────────────────────────
# 카카오 알림톡 구현체 (채널 승인 후 구현)
# ──────────────────────────────────────────────

class KakaoAlimtalkSender:
    """카카오 알림톡 발송 구현체.

    카카오 비즈니스 채널(플러스친구) 승인 완료 후 구현한다.
    전환 시 notify_subscribers.py에서 이 클래스로 sender를 교체하면 된다.
    """

    def send(self, subscription: Subscription, products: list[Product]) -> bool:
        raise NotImplementedError(
            "카카오 알림톡 채널 승인 후 구현 예정입니다. "
            "현재는 ResendEmailSender를 사용하세요."
        )


# ──────────────────────────────────────────────
# 팩토리 함수
# ──────────────────────────────────────────────

def create_sender() -> NotificationSender:
    """현재 활성 발송 구현체를 반환한다.

    카카오 알림톡 전환 시 이 함수에서 KakaoAlimtalkSender()를 반환하도록 수정한다.
    """
    return ResendEmailSender()
