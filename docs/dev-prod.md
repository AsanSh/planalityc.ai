# DEV/PROD setup

This repository uses one codebase with separate environments:

- `develop` deploys to staging.
- `main` deploys to production.
- `feature/*` and `hotfix/*` branches must merge by pull request.

Production must not be used as the first place where migrations or deployments are tested.

## Required GitHub environments

Create these in GitHub: Settings -> Environments.

- `staging`
- `production`

For `production`, enable required reviewers before deployment.

## Required GitHub secrets

Repository or environment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_API_PROJECT_ID_STAGING`
- `VERCEL_API_PROJECT_ID_PRODUCTION`
- `VERCEL_FRONTEND_PROJECT_ID_STAGING`
- `VERCEL_FRONTEND_PROJECT_ID_PRODUCTION`
- `DATABASE_URL_PRODUCTION`

Repository or environment variables:

- `VITE_API_URL_STAGING`
- `VITE_API_URL_PRODUCTION`

## Vercel projects

Use separate Vercel projects, so staging cannot accidentally point at production settings:

- API staging
- API production
- Frontend staging
- Frontend production

Each Vercel project should own its environment variables. At minimum:

API:

- `DATABASE_URL`
- `NODE_ENV=production`
- `ALLOWED_ORIGINS`
- `SESSION_SECRET`
- `CRON_SECRET`
- `BLOB_READ_WRITE_TOKEN`, if file uploads are enabled
- `SENTRY_DSN`, if error monitoring is enabled

Frontend:

- `VITE_API_URL`

## Database

Use separate databases:

- `planalityc_staging`
- `planalityc_production`

Run migrations on staging before merging to `main`. The production workflow creates a `pg_dump` backup artifact before deploying the API, because the API runs Drizzle migrations on startup.

## Branch protection

Protect `main`:

- disallow direct pushes
- require pull request
- require CI checks
- require at least one approval
- require production environment approval

Protect `develop` enough to keep staging stable:

- require pull request or at least require CI checks

## Release flow

1. Create `feature/name`.
2. Open pull request into `develop`.
3. Merge to `develop`; staging deploy runs.
4. Verify staging against the staging database and storage.
5. Open pull request from `develop` to `main`.
6. Merge after approval; production backup and deploy run.

## Rollback

Application rollback:

- Use the previous Ready deployment in Vercel for frontend/API.

Database rollback:

- Prefer forward-fix migrations.
- If a destructive migration failed, restore from the uploaded production backup artifact or a Neon/Supabase snapshot.
- Never edit production schema manually outside an incident procedure.
