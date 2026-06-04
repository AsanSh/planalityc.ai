-- Migration 0032: payroll employees legal entity assignment

ALTER TABLE "payroll_employees"
  ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;

CREATE INDEX IF NOT EXISTS "idx_payroll_employees_legal_entity"
  ON "payroll_employees" ("company_id", "legal_entity_id");
