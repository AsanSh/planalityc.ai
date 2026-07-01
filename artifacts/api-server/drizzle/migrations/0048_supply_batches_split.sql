-- Migration: партионный учёт + разбиение заявки «со склада / докупить» (фаза 3)
-- All statements are idempotent (CREATE TABLE / ADD COLUMN IF NOT EXISTS) — self-heal safe.

CREATE TABLE IF NOT EXISTS warehouse_stock_batches (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  item_id      INTEGER NOT NULL,
  incoming_id  INTEGER,
  quantity     NUMERIC(14,3) NOT NULL DEFAULT '0',
  unit_price   NUMERIC(14,2) NOT NULL DEFAULT '0',
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS warehouse_stock_batches_wh_item_idx
  ON warehouse_stock_batches (warehouse_id, item_id);

ALTER TABLE supply_request_items ADD COLUMN IF NOT EXISTS fulfill_mode TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE supply_request_items ADD COLUMN IF NOT EXISTS from_stock_qty NUMERIC(14,3) NOT NULL DEFAULT '0';
ALTER TABLE supply_request_items ADD COLUMN IF NOT EXISTS purchase_qty NUMERIC(14,3) NOT NULL DEFAULT '0';
ALTER TABLE supply_request_items ADD COLUMN IF NOT EXISTS reserved_warehouse_id INTEGER;
