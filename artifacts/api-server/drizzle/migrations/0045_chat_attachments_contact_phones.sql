ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_name" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_mime" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_data" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_size" integer;

ALTER TABLE "counterparties" ADD COLUMN IF NOT EXISTS "phones" jsonb;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "phones" jsonb;
