CREATE TABLE IF NOT EXISTS "registration_verifications" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_registration_verifications_email"
  ON "registration_verifications" ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_registration_verifications_token_hash"
  ON "registration_verifications" ("token_hash");

CREATE INDEX IF NOT EXISTS "idx_registration_verifications_expires_at"
  ON "registration_verifications" ("expires_at");
