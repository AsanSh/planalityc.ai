-- Migration: позиции заказа снабжения (S3). Idempotent.
-- Заказ строится из части «докупить» позиций заявки; цена из прайса поставщика.

CREATE TABLE IF NOT EXISTS supply_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  request_item_id INTEGER,
  global_product_id INTEGER,
  supplier_product_id INTEGER,
  custom_name TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'шт',
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supply_order_items_order_idx ON supply_order_items (order_id);
