-- 상품 고유 키를 (store, name, valid_from) → (store, name)으로 변경
-- 같은 편의점+상품명은 행사기간이 달라도 동일 상품으로 처리 (upsert 시 날짜 갱신)

-- 1. 중복 행 중 valid_from이 가장 최신인 것만 남기고 나머지 삭제
DELETE FROM products
WHERE id NOT IN (
  SELECT DISTINCT ON (store, name) id
  FROM products
  ORDER BY store, name, valid_from DESC
);

-- 2. 기존 unique constraint 제거
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_store_name_valid_from_key;

-- 3. 새 unique constraint 추가
ALTER TABLE products
  ADD CONSTRAINT products_store_name_key UNIQUE (store, name);
