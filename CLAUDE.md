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
- **DB schema (single source):** `artifacts/api-server/src/lib/db` — drizzle.config.ts тоже указывает сюда; legacy-дубликат `lib/db` удалён
- **UI design system:** `artifacts/proptech/.interface-design/system.md` — правда по UI-паттернам. **Все таблицы — ТОЛЬКО через `<DataTable>`** (`src/components/data-table.tsx`); сырой `<table>`/голый shadcn `<Table>` для данных запрещены. Тёмная тема — см. раздел Dark theme там же.

## Deploy

| Приложение | Vercel project | Production URL |
|------------|----------------|----------------|
| Frontend | `planalityc.ai` | https://planalitycai.vercel.app |
| API | `planalityc-api` | https://planalityc-api.vercel.app |

`VITE_API_URL` для frontend: `https://planalityc-api.vercel.app`.

**Не путать** с отдельным Proptech (`proptech-sigma-eight` / `proptech-api`) — другой репозиторий/деплой.

Подробности: [.cursor/rules/vercel-deploy-production.mdc](.cursor/rules/vercel-deploy-production.mdc).
