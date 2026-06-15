# CLAUDE.md

Project instructions for AI agents in this repo.

## Rules (source of truth)

| Topic | File |
|-------|------|
| Assumptions, success criteria, dead code | [.cursor/rules/agent-execution.mdc](.cursor/rules/agent-execution.mdc) |
| DB, auth, migrations, destructive ops, **не удалять users** | [.cursor/rules/project-safety.mdc](.cursor/rules/project-safety.mdc) |
| Simplicity, surgical diffs, scope | Cursor **user rules** (global) |

Do not duplicate those guidelines here.

## Stack (Asset-Manager)

- **Frontend:** `artifacts/proptech` — React, Vite, TanStack Query, Orval api-client
- **API:** `artifacts/api-server` — Express, Drizzle, Vercel serverless
- **Shared schemas (legacy duplicate):** `lib/db` vs `artifacts/api-server/src/lib/db` — runtime uses api-server copy

## Deploy

| Приложение | Vercel project | Production URL |
|------------|----------------|----------------|
| Frontend | `planalityc.ai` | https://planalitycai.vercel.app |
| API | `planalityc-api` | https://planalityc-api.vercel.app |

`VITE_API_URL` для frontend: `https://planalityc-api.vercel.app`.

**Не путать** с отдельным Proptech (`proptech-sigma-eight` / `proptech-api`) — другой репозиторий/деплой.

Подробности: [.cursor/rules/vercel-deploy-production.mdc](.cursor/rules/vercel-deploy-production.mdc).
