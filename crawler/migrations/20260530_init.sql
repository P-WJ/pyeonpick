CREATE TABLE IF NOT EXISTS products (
    id          BIGSERIAL PRIMARY KEY,
    store       TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       INTEGER NOT NULL,
    event_type  TEXT NOT NULL,
    category    TEXT NOT NULL,
    image_url   TEXT NOT NULL DEFAULT '',
    valid_from  DATE NOT NULL,
    valid_to    DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_store_name_valid_from_key UNIQUE (store, name, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products (store);
CREATE INDEX IF NOT EXISTS idx_products_event_type ON products (event_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_valid_to ON products (valid_to);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
