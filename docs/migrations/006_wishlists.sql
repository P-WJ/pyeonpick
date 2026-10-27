-- 로그인 사용자 찜 목록 (기기 간 동기화)
-- 비로그인 사용자는 기존처럼 localStorage(cvs-wishlist-v1)만 사용한다.
-- Supabase SQL Editor에서 수동 실행.

CREATE TABLE IF NOT EXISTS wishlists (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

-- 서버(service role)만 접근한다. anon 키로는 읽기·쓰기 불가.
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
