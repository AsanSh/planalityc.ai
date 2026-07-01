-- Migration: warehouses + warehouse_stock + warehouse_transfers (модуль снабжения, фаза 1)
-- Многоуровневые склады (центральный / объектный / прорабский), остатки с резервом,
-- документальные перемещения между складами.
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING) — self-heal safe.

CREATE TABLE IF NOT EXISTS warehouses (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'central',
  project_id          INTEGER,
  responsible_user_id INTEGER,
  address             TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL,
  warehouse_id      INTEGER NOT NULL,
  item_id           INTEGER NOT NULL,
  quantity          NUMERIC(14,3) NOT NULL DEFAULT '0',
  reserved_quantity NUMERIC(14,3) NOT NULL DEFAULT '0',
  avg_price         NUMERIC(14,2) NOT NULL DEFAULT '0',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_warehouse_item_uniq
  ON warehouse_stock (warehouse_id, item_id);

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL,
  from_warehouse_id INTEGER NOT NULL,
  to_warehouse_id   INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  document_number   TEXT,
  sent_by           INTEGER,
  received_by       INTEGER,
  sent_at           TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id                 SERIAL PRIMARY KEY,
  transfer_id        INTEGER NOT NULL,
  item_id            INTEGER NOT NULL,
  quantity_sent      NUMERIC(14,3) NOT NULL DEFAULT '0',
  quantity_received  NUMERIC(14,3),
  notes              TEXT
);

-- Backfill: центральный склад для каждой компании, у которой есть позиции, но нет склада
INSERT INTO warehouses (company_id, name, type, is_active)
SELECT DISTINCT wi.company_id, 'Центральный склад', 'central', TRUE
FROM warehouse_items wi
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.company_id = wi.company_id AND w.type = 'central'
);

-- Backfill: перенести текущие остатки позиций на центральный склад компании
INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, avg_price)
SELECT wi.company_id, w.id, wi.id, COALESCE(wi.current_stock, '0'), COALESCE(wi.unit_price, '0')
FROM warehouse_items wi
JOIN warehouses w ON w.company_id = wi.company_id AND w.type = 'central'
ON CONFLICT (warehouse_id, item_id) DO NOTHING;
