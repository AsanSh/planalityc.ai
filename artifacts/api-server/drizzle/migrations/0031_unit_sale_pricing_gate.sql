ALTER TABLE construction_units
  ADD COLUMN IF NOT EXISTS base_price_per_sqm numeric(12, 2),
  ADD COLUMN IF NOT EXISTS sale_coefficient numeric(8, 4),
  ADD COLUMN IF NOT EXISTS approved_sale_price_per_sqm numeric(12, 2),
  ADD COLUMN IF NOT EXISTS approved_total_price numeric(15, 2),
  ADD COLUMN IF NOT EXISTS is_published_for_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_approved_by integer,
  ADD COLUMN IF NOT EXISTS price_approved_at timestamptz;

UPDATE construction_units
SET
  base_price_per_sqm = COALESCE(base_price_per_sqm, price_per_sqm),
  sale_coefficient = COALESCE(sale_coefficient, 1),
  approved_sale_price_per_sqm = COALESCE(approved_sale_price_per_sqm, price_per_sqm),
  approved_total_price = COALESCE(approved_total_price, total_price)
WHERE price_per_sqm IS NOT NULL;
