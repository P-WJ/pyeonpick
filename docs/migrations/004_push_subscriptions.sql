-- 웹 푸시 구독 테이블
-- push_subscriptions: 브라우저 Web Push API 구독 정보 저장
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint  text        NOT NULL UNIQUE,   -- PushSubscription.endpoint
  p256dh    text        NOT NULL,          -- PushSubscription.keys.p256dh (base64url)
  auth      text        NOT NULL,          -- PushSubscription.keys.auth (base64url)
  keywords  text[]      DEFAULT '{}',      -- 알림 받을 키워드 (빈 배열 = 전체)
  stores    text[]      DEFAULT '{}',      -- 알림 받을 편의점 (빈 배열 = 전체)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions (endpoint);
