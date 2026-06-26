-- Idempotent: add docType, payload, docStatus columns to documents table for generated docs (tax_invoice, invoice, etc.)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "doc_type" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "payload" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "doc_status" TEXT NOT NULL DEFAULT 'draft';
-- Make file_url nullable so generated docs (without a real file URL) can be stored
ALTER TABLE "documents" ALTER COLUMN "file_url" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_documents_company_entity" ON "documents" ("company_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_documents_doc_type" ON "documents" ("company_id", "doc_type");
