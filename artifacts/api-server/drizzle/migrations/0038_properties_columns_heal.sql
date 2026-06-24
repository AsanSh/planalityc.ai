-- Heal schema drift on "properties": several columns exist in the Drizzle schema
-- (legal_entity_id, rental_status, market_value, sync fields) but hand-authored
-- migrations may have been skipped on prod, causing 500 on SELECT. Idempotent.
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rental_status" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "market_value" numeric(18,2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sync_status" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamptz;
ALTER TABLE "payroll_employees" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
ALTER TABLE "construction_projects" ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;
