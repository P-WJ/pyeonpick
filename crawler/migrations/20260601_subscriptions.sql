-- v1.1 알림 설정 테이블

CREATE TABLE IF NOT EXISTS subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    keywords    TEXT[] NOT NULL DEFAULT '{}',   -- 빈 배열 = 전체 상품
    stores      TEXT[] NOT NULL DEFAULT '{}',   -- 빈 배열 = 전체 편의점
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 활성 구독은 이메일당 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_email_active_idx
    ON subscriptions (email)
    WHERE is_active = TRUE;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
