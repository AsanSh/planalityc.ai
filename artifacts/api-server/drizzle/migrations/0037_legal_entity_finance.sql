-- Multi-legal-entity (management accounting): tag finance/transaction rows with legal_entity_id.
-- Idempotent: re-applied every cold start via migrate.ts selfHeal. ADD COLUMN IF NOT EXISTS +
-- backfill guarded by IS NULL so it never clobbers values set later.

ALTER TABLE "accruals" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "construction_accruals" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "construction_expenses" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "construction_operations" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "construction_budget_items" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "warehouse_supplier_payments" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "warehouse_incoming" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "supply_requests" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "supply_orders" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "counterparties" ADD COLUMN IF NOT EXISTS "linked_legal_entity_id" integer;

CREATE INDEX IF NOT EXISTS "idx_accruals_legal_entity" ON "accruals" ("legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_payments_legal_entity" ON "payments" ("legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_legal_entity" ON "expenses" ("legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_constr_accruals_legal_entity" ON "construction_accruals" ("legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_constr_expenses_legal_entity" ON "construction_expenses" ("legal_entity_id");
CREATE INDEX IF NOT EXISTS "idx_constr_operations_legal_entity" ON "construction_operations" ("legal_entity_id");

-- Backfill from the owning parent (project / property) where derivable.
UPDATE "construction_accruals" c SET "legal_entity_id" = p."legal_entity_id"
  FROM "construction_projects" p WHERE c."project_id" = p."id" AND c."legal_entity_id" IS NULL AND p."legal_entity_id" IS NOT NULL;
UPDATE "construction_expenses" c SET "legal_entity_id" = p."legal_entity_id"
  FROM "construction_projects" p WHERE c."project_id" = p."id" AND c."legal_entity_id" IS NULL AND p."legal_entity_id" IS NOT NULL;
UPDATE "construction_operations" c SET "legal_entity_id" = p."legal_entity_id"
  FROM "construction_projects" p WHERE c."project_id" = p."id" AND c."legal_entity_id" IS NULL AND p."legal_entity_id" IS NOT NULL;
UPDATE "construction_budget_items" c SET "legal_entity_id" = p."legal_entity_id"
  FROM "construction_projects" p WHERE c."project_id" = p."id" AND c."legal_entity_id" IS NULL AND p."legal_entity_id" IS NOT NULL;
UPDATE "expenses" e SET "legal_entity_id" = pr."legal_entity_id"
  FROM "properties" pr WHERE e."property_id" = pr."id" AND e."legal_entity_id" IS NULL AND pr."legal_entity_id" IS NOT NULL;
