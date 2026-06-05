# Security audit notes

Last checked: 2026-06-05.

## Frontend audit

`pnpm audit --prod` still reports high severity advisories for `xlsx@0.18.5`:

- `GHSA-4r6h-8v6p-xvw6` / `CVE-2023-30533`: prototype pollution while reading crafted spreadsheet files.
- `GHSA-5pgg-2g8v-p4x9` / `CVE-2024-22363`: ReDoS in SheetJS parsing.

The npm package has no patched npm release. The affected code paths are:

- `src/pages/import-center.tsx`
- `src/pages/rental/analytics/summary.tsx`
- `src/lib/chess-units-xlsx.ts`
- `src/lib/marketplace-price-template.ts`

Export-only flows are lower risk. Import flows that parse arbitrary user files are the real risk.

Recommended remediation:

1. Replace `xlsx` with a maintained parser/exporter or move Excel parsing to a hardened backend worker.
2. Keep client-side import guarded by file type, file size, row count and sheet count limits until migration is complete.
3. Prefer CSV for low-risk bulk imports where formatting is not required.

## Workspace audit

The monorepo audit also reports high severity issues from `artifacts__api-server`, including transitive dependencies under `@vercel/blob`, `@sentry/node`, `express` and `exceljs`. Those are outside the frontend package but still visible when auditing the whole workspace.
