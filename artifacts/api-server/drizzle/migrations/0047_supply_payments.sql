-- Migration: финсогласование и оплата заказа снабжения (фаза 2)
-- Статусы оплаты на supply_orders + матрица лимитов согласования.
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS) — self-heal safe.

ALTER TABLE supply_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE supply_orders ADD COLUMN IF NOT EXISTS finance_approved_by INTEGER;
ALTER TABLE supply_orders ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ;
ALTER TABLE supply_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) NOT NULL DEFAULT '0';

CREATE TABLE IF NOT EXISTS approval_limits (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL,
  role        TEXT NOT NULL,
  max_amount  NUMERIC(15,2) NOT NULL DEFAULT '0',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approval_limits_company_idx ON approval_limits (company_id);
