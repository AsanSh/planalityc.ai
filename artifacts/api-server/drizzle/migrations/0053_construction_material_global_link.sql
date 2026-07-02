-- Migration: связка материалов стройки с единым каталогом (S0).
-- Позволяет ссылаться на канонический товар из construction_materials.
-- Idempotent (ADD COLUMN IF NOT EXISTS) — self-heal safe.

ALTER TABLE construction_materials ADD COLUMN IF NOT EXISTS global_product_id INTEGER;

CREATE INDEX IF NOT EXISTS construction_materials_global_product_idx
  ON construction_materials (company_id, global_product_id);
