-- RBAC permissions: idempotent schema additions
-- This migration does NOT create new tables (permissions are resolved
-- in code from users.role via ROLE_PRESETS). We add a comments column
-- to the roles table (if it exists) so role records can carry notes.
-- All statements are IF NOT EXISTS safe.

-- Ensure the roles table has a description column (non-destructive)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Ensure the roles table has a permissions column as jsonb (non-destructive)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
