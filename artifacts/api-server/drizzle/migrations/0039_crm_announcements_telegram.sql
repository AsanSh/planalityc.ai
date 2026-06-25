CREATE TABLE IF NOT EXISTS "crm_announcements" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "segment" TEXT NOT NULL DEFAULT '',
  "channel" TEXT NOT NULL DEFAULT 'Портал',
  "status" TEXT NOT NULL DEFAULT 'Черновик',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_crm_announcements_company" ON "crm_announcements" ("company_id");
CREATE TABLE IF NOT EXISTS "telegram_settings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "chat_id" TEXT NOT NULL DEFAULT '',
  "notifications" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
