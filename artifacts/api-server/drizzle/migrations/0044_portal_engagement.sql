-- Portal poll votes: one vote per (contentId, voterUserId), upsert on conflict
CREATE TABLE IF NOT EXISTS "portal_poll_votes" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "content_id" INTEGER NOT NULL,
  "voter_user_id" INTEGER NOT NULL,
  "option_index" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "portal_poll_votes_content_voter_uniq" UNIQUE ("content_id", "voter_user_id")
);
CREATE INDEX IF NOT EXISTS "idx_portal_poll_votes_content" ON "portal_poll_votes" ("content_id");
CREATE INDEX IF NOT EXISTS "idx_portal_poll_votes_company" ON "portal_poll_votes" ("company_id");

-- Portal content reads: idempotent per (contentId, viewerUserId)
CREATE TABLE IF NOT EXISTS "portal_content_reads" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "content_id" INTEGER NOT NULL,
  "viewer_user_id" INTEGER NOT NULL,
  "read_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "portal_content_reads_content_viewer_uniq" UNIQUE ("content_id", "viewer_user_id")
);
CREATE INDEX IF NOT EXISTS "idx_portal_content_reads_content" ON "portal_content_reads" ("content_id");
CREATE INDEX IF NOT EXISTS "idx_portal_content_reads_company" ON "portal_content_reads" ("company_id");
