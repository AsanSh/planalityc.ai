-- Migration: связка складской номенклатуры с единым каталогом (фаза 3+)
-- Позволяет авто-резолвить позицию заявки → warehouse_item через global_product_id.
-- Idempotent (ADD COLUMN IF NOT EXISTS) — self-heal safe.

ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS global_product_id INTEGER;

CREATE INDEX IF NOT EXISTS warehouse_items_global_product_idx
  ON warehouse_items (company_id, global_product_id);
