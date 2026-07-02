-- Migration: заявки на изменение спецификаций помещения (площадь, мокрые точки, двери и пр.)
-- Создаёт продажник/РП из шахматки, ПТО принимает в работу или отклоняет; строки = история.
-- Idempotent (CREATE TABLE IF NOT EXISTS) — self-heal safe.

CREATE TABLE IF NOT EXISTS construction_unit_change_requests (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL,
  project_id          INTEGER,
  unit_id             INTEGER NOT NULL,
  spec_type           TEXT NOT NULL DEFAULT 'area',
  current_value       TEXT,
  requested_value     TEXT NOT NULL,
  comment             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  requested_by        INTEGER,
  requested_by_name   TEXT,
  requester_role      TEXT,
  reviewed_by         INTEGER,
  reviewed_by_name    TEXT,
  review_comment      TEXT,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ucr_company_status_idx ON construction_unit_change_requests (company_id, status);
CREATE INDEX IF NOT EXISTS ucr_unit_idx ON construction_unit_change_requests (unit_id);
