CREATE TABLE IF NOT EXISTS "portal_content" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'news',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "audience" TEXT NOT NULL DEFAULT 'all',
  "placement" TEXT DEFAULT 'home',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "project_name" TEXT,
  "image_url" TEXT,
  "price_label" TEXT,
  "reward_points" INTEGER,
  "cta_label" TEXT,
  "cta_url" TEXT,
  "poll_options" JSONB,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "publish_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_portal_content_company_id"
  ON "portal_content" ("company_id");

CREATE INDEX IF NOT EXISTS "idx_portal_content_company_audience_status"
  ON "portal_content" ("company_id", "audience", "status");
