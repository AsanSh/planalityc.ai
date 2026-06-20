ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "legal_entity_id" integer;

CREATE INDEX IF NOT EXISTS "idx_properties_company_legal_entity"
  ON "properties" ("company_id", "legal_entity_id");

UPDATE "properties" AS p
SET "legal_entity_id" = le.id
FROM (
  SELECT DISTINCT ON ("company_id") id, "company_id"
  FROM "legal_entities"
  WHERE "is_active" = true
  ORDER BY "company_id", "created_at"
) AS le
WHERE p."company_id" = le."company_id"
  AND p."legal_entity_id" IS NULL;
