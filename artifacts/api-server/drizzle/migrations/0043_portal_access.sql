-- Migration: portal_access table
-- Stores portal access records per counterparty (replaces localStorage).
-- All statements are idempotent (IF NOT EXISTS / DO NOTHING).

CREATE TABLE IF NOT EXISTS portal_access (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL,
  counterparty_id INTEGER NOT NULL,
  portal_kind TEXT NOT NULL,
  access_code TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  meta        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_access_company_counterparty_uidx
  ON portal_access (company_id, counterparty_id);
