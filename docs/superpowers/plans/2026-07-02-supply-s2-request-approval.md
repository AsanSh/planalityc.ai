# S2 Заявка прораб→ПТО: статусы + лимиты — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development или superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Заявка снабжения получает единую статус-машину (draft→pending_approval→approved→…), стартует всегда с `draft`, требует объект (projectId), и согласование реально проверяется по матрице лимитов на сумму.

**Architecture:** Чистая логика в `supply-workflow.ts` (машина статусов заявки) и расширение `supply-payments.ts` (`canApproveAmount`) — обе без БД, покрыты юнит-тестами. Миграция добавляет `estimated_amount` и меняет дефолт/бэкофилл статусов. Точечная проводка в `routes/supply.ts` подключает логику к эндпоинтам создания/отправки/согласования.

**Tech Stack:** TypeScript, Express, Drizzle, Postgres, `node:test`/`node:assert`, tsx.

**Родитель:** [2026-07-02-supply-construction-architecture.md](../specs/2026-07-02-supply-construction-architecture.md) — подсистема S2.

## Проектные решения S2 (зафиксированы)

- **Статусы заявки:** `draft | pending_approval | approved | planned | ordered | closed | rejected | cancelled`. Новые значения, без обратной совместимости (согласовано ранее).
- **Объект и этап уже есть в схеме** (`supply_requests.project_id`, `construction_stage_id`) — S2 их требует/использует, не добавляет.
- **Сумма заявки для лимита:** новое поле `estimated_amount` (numeric, default 0). В S2 задаётся клиентом при создании/отправке; авто-расчёт по ценам поставщиков — задача S3 (заказ). Если `estimated_amount = 0` и матрица лимитов пустая — согласование не ограничивается.
- **Полномочия согласующего = матрица лимитов:** роль с бóльшим `maxAmount` — старше. Согласующий проходит, если его лимит ≥ лимита требуемой роли.

## Вне объёма S2 (следующие циклы / отдельно)

- Полный расщеп `routes/supply.ts` на `routes/supply/*` + `services/supply/*` — **отложено**: поведение-сохраняющий рефактор 698-строчного файла нельзя проверить без запуска приложения (нет локального Postgres/сервиса). Делается, когда доступен прогон приложения/CI.
- Машина статусов заказа и координация `status`↔`payment_status` — S3/S5.
- План «со склада/докупить» и позиции заказа — S3.

---

## File Structure

- Create `artifacts/api-server/src/lib/supply-workflow.ts` (+ `.test.ts`) — машина статусов заявки.
- Modify `artifacts/api-server/src/lib/supply-payments.ts` (+ `.test.ts`) — добавить `canApproveAmount`.
- Create `artifacts/api-server/drizzle/migrations/0052_supply_request_status_amount.sql` — `estimated_amount` + бэкофилл статусов.
- Modify `artifacts/api-server/src/lib/db/schema/supply.ts` — колонка `estimatedAmount`, комментарий статусов.
- Modify `artifacts/api-server/src/lib/migrate.ts` — регистрация 0052.
- Modify `artifacts/api-server/src/routes/supply.ts` — старт-статус `draft`, требование `projectId`, эндпоинт `submit`, проверка лимита в согласовании, `nextRequestStatus`.

---

## Task 1: Машина статусов заявки (чистая логика)

**Files:**
- Create: `artifacts/api-server/src/lib/supply-workflow.ts`
- Test: `artifacts/api-server/src/lib/supply-workflow.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `artifacts/api-server/src/lib/supply-workflow.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextRequestStatus,
  type RequestStatus,
  type RequestEvent,
} from "./supply-workflow";

test("submit: draft → pending_approval", () => {
  assert.equal(nextRequestStatus("draft", { type: "submit" }), "pending_approval");
});

test("approve: pending_approval → approved", () => {
  assert.equal(nextRequestStatus("pending_approval", { type: "approve" }), "approved");
});

test("reject: pending_approval → rejected", () => {
  assert.equal(nextRequestStatus("pending_approval", { type: "reject" }), "rejected");
});

test("plan: approved → planned", () => {
  assert.equal(nextRequestStatus("approved", { type: "plan" }), "planned");
});

test("order: planned → ordered", () => {
  assert.equal(nextRequestStatus("planned", { type: "order" }), "ordered");
});

test("close: ordered → closed", () => {
  assert.equal(nextRequestStatus("ordered", { type: "close" }), "closed");
});

test("cancel допустим из draft/pending_approval/approved/planned", () => {
  const froms: RequestStatus[] = ["draft", "pending_approval", "approved", "planned"];
  for (const s of froms) {
    assert.equal(nextRequestStatus(s, { type: "cancel" }), "cancelled");
  }
});

test("недопустимый переход бросает", () => {
  assert.throws(() => nextRequestStatus("approved", { type: "approve" } as RequestEvent));
  assert.throws(() => nextRequestStatus("ordered", { type: "cancel" }));
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-workflow.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать модуль**

Создать `artifacts/api-server/src/lib/supply-workflow.ts`:

```ts
/**
 * Чистая машина статусов ЗАЯВКИ снабжения (S2) — единственный источник правды
 * по переходам заявки. Без БД. Машина статусов ОПЛАТЫ — в supply-payments.ts.
 */

export type RequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "planned"
  | "ordered"
  | "closed"
  | "rejected"
  | "cancelled";

export type RequestEvent =
  | { type: "submit" }
  | { type: "approve" }
  | { type: "reject" }
  | { type: "plan" }
  | { type: "order" }
  | { type: "close" }
  | { type: "cancel" };

const CANCELLABLE: RequestStatus[] = ["draft", "pending_approval", "approved", "planned"];

/** Переход машины статусов заявки. Бросает при недопустимом переходе. */
export function nextRequestStatus(current: RequestStatus, event: RequestEvent): RequestStatus {
  switch (event.type) {
    case "submit":
      if (current === "draft") return "pending_approval";
      break;
    case "approve":
      if (current === "pending_approval") return "approved";
      break;
    case "reject":
      if (current === "pending_approval") return "rejected";
      break;
    case "plan":
      if (current === "approved") return "planned";
      break;
    case "order":
      if (current === "planned") return "ordered";
      break;
    case "close":
      if (current === "ordered") return "closed";
      break;
    case "cancel":
      if (CANCELLABLE.includes(current)) return "cancelled";
      break;
  }
  throw new Error(`Недопустимый переход заявки: ${current} + ${event.type}`);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-workflow.test.ts`
Expected: PASS — 8 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/supply-workflow.ts artifacts/api-server/src/lib/supply-workflow.test.ts
git commit -m "feat(supply): машина статусов заявки (S2)"
```

---

## Task 2: Проверка полномочий согласующего по лимиту (чистая логика)

**Files:**
- Modify: `artifacts/api-server/src/lib/supply-payments.ts`
- Test: `artifacts/api-server/src/lib/supply-payments.test.ts` (дополнить существующий файл)

- [ ] **Step 1: Дописать падающие тесты**

В конец `artifacts/api-server/src/lib/supply-payments.test.ts` добавить (файл использует `node:test`/`node:assert/strict` — импорт `canApproveAmount` добавить к существующему импорту из `./supply-payments`):

```ts
import { canApproveAmount } from "./supply-payments";

const limits = [
  { role: "foreman", maxAmount: "100000" },
  { role: "manager", maxAmount: "500000" },
  { role: "director", maxAmount: "5000000" },
];

test("роль с достаточным лимитом согласует", () => {
  assert.equal(canApproveAmount("manager", "300000", limits), true);
});

test("роль с недостаточным лимитом не согласует", () => {
  assert.equal(canApproveAmount("foreman", "300000", limits), false);
});

test("сумма выше всех лимитов — только высшая роль", () => {
  assert.equal(canApproveAmount("director", "9000000", limits), true);
  assert.equal(canApproveAmount("manager", "9000000", limits), false);
});

test("роль вне матрицы не согласует", () => {
  assert.equal(canApproveAmount("intern", "1000", limits), false);
});

test("пустая матрица — не ограничиваем (true)", () => {
  assert.equal(canApproveAmount("anyone", "1000000", []), true);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-payments.test.ts`
Expected: FAIL — `canApproveAmount` не экспортирована.

- [ ] **Step 3: Реализовать функцию**

В `artifacts/api-server/src/lib/supply-payments.ts` в конец файла добавить:

```ts
/**
 * Может ли согласующий с ролью approverRole утвердить заявку на сумму amount
 * по матрице лимитов. Полномочия = maxAmount роли: старше тот, у кого лимит больше.
 * Пустая матрица — ограничение не применяется (true).
 */
export function canApproveAmount(
  approverRole: string,
  amount: string,
  limits: ApprovalLimit[],
): boolean {
  if (limits.length === 0) return true;
  const approverLimit = limits.find((l) => l.role === approverRole);
  if (!approverLimit) return false;
  const requiredRole = resolveRequiredApprover(amount, limits);
  if (requiredRole == null) return true;
  const requiredLimit = limits.find((l) => l.role === requiredRole);
  if (!requiredLimit) return false;
  return Number(approverLimit.maxAmount) >= Number(requiredLimit.maxAmount);
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-payments.test.ts`
Expected: PASS — существующие + 5 новых тестов зелёные.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/supply-payments.ts artifacts/api-server/src/lib/supply-payments.test.ts
git commit -m "feat(supply): проверка полномочий согласующего по лимиту (S2)"
```

---

## Task 3: Миграция — сумма заявки + бэкофилл статусов

**Files:**
- Create: `artifacts/api-server/drizzle/migrations/0052_supply_request_status_amount.sql`
- Modify: `artifacts/api-server/src/lib/db/schema/supply.ts`
- Modify: `artifacts/api-server/src/lib/migrate.ts`

- [ ] **Step 1: Написать миграцию**

Создать `artifacts/api-server/drizzle/migrations/0052_supply_request_status_amount.sql`:

```sql
-- Migration: сумма заявки для лимитов согласования + новые статусы заявки (S2).
-- Idempotent. Бэкофилл старого статуса pending → pending_approval.

ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Новый дефолт стартового статуса
ALTER TABLE supply_requests ALTER COLUMN status SET DEFAULT 'draft';

-- Бэкофилл: старое 'pending' → 'pending_approval' (остальные значения 1:1)
UPDATE supply_requests SET status = 'pending_approval' WHERE status = 'pending';
```

- [ ] **Step 2: Обновить drizzle-схему**

В `artifacts/api-server/src/lib/db/schema/supply.ts`, в `supplyRequestsTable`:
- Заменить строку статуса на новый дефолт и комментарий:

```ts
  status: text("status").notNull().default("draft"), // draft | pending_approval | approved | planned | ordered | closed | rejected | cancelled
```

- После строки `neededByDate: text("needed_by_date"),` добавить:

```ts
  estimatedAmount: numeric("estimated_amount", { precision: 15, scale: 2 }).notNull().default("0"),
```

(`numeric` уже импортирован в этом файле — проверить импорт `from "drizzle-orm/pg-core"`.)

- [ ] **Step 3: Зарегистрировать миграцию**

В `artifacts/api-server/src/lib/migrate.ts` в конец массива `selfHeal` (после `"0051_nomenclature_base_seed.sql"`) добавить:

```ts
"0052_supply_request_status_amount.sql",
```

- [ ] **Step 4: Проверить типы**

Run: `cd artifacts/api-server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/drizzle/migrations/0052_supply_request_status_amount.sql \
        artifacts/api-server/src/lib/db/schema/supply.ts \
        artifacts/api-server/src/lib/migrate.ts
git commit -m "feat(supply): сумма заявки + новые статусы (S2 migration)"
```

---

## Task 4: Проводка логики в роут заявок

**Files:**
- Modify: `artifacts/api-server/src/routes/supply.ts`

**Контекст:** файл уже импортирует `supplyRequestsTable`, `supplyApprovalsTable`, `approvalLimitsTable`, `db`, `and`, `eq`, и из `../lib/supply-payments` — `resolveRequiredApprover`. Роутер уже под `requireAuth`/`requireTenantCompany`/`requireEnabledModule`.

- [ ] **Step 1: Обновить импорты и набор статусов**

В шапке `artifacts/api-server/src/routes/supply.ts`:
- Добавить импорт машины статусов:
```ts
import { nextRequestStatus } from "../lib/supply-workflow";
```
- В импорт из `../lib/supply-payments` добавить `canApproveAmount` (рядом с `resolveRequiredApprover`).
- Заменить константу статусов:
```ts
const REQUEST_STATUSES = new Set([
  "draft", "pending_approval", "approved", "planned", "ordered", "closed", "rejected", "cancelled",
]);
```

- [ ] **Step 2: Создание заявки — старт всегда `draft`, требовать `projectId`**

В обработчике `router.post("/supply/requests", ...)`:
- Удалить приём `status` от клиента: убрать строки, читающие `body.status` и проверку `REQUEST_STATUSES.has(status)`. Вместо переменной `status` использовать литерал `"draft"` при вставке.
- После проверки `items.length === 0` добавить требование объекта:

```ts
    if (!body.projectId) {
      res.status(400).json({ error: "Укажите объект (projectId) заявки" });
      return;
    }
```

- В `tx.insert(supplyRequestsTable).values({ ... })` заменить `status,` на `status: "draft",` и добавить строку:

```ts
        estimatedAmount: String(body.estimatedAmount ?? "0"),
```

- [ ] **Step 3: Новый эндпоинт отправки на согласование (draft → pending_approval)**

Сразу после обработчика создания заявки добавить:

```ts
// POST /supply/requests/:id/submit — прораб отправляет заявку ПТО на согласование
router.post("/supply/requests/:id/submit", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const id = Number(req.params.id);
  const [request] = await db
    .select()
    .from(supplyRequestsTable)
    .where(and(eq(supplyRequestsTable.id, id), eq(supplyRequestsTable.companyId, companyId)));
  if (!request) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  let next: string;
  try {
    next = nextRequestStatus(request.status as never, { type: "submit" });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Недопустимый переход" });
    return;
  }
  const [updated] = await db
    .update(supplyRequestsTable)
    .set({ status: next })
    .where(eq(supplyRequestsTable.id, id))
    .returning();
  res.json(updated);
});
```

- [ ] **Step 4: Согласование — проверка лимита + машина статусов**

В обработчике `router.post("/supply/requests/:id/approvals", ...)` заменить блок после загрузки `request` (там, где сейчас пишется approval и напрямую ставится `approved`/`rejected`) на проводку через лимит и машину:

```ts
    // сумма заявки → требуемый уровень согласования по матрице лимитов
    if (status === "approved") {
      const limits = await db
        .select()
        .from(approvalLimitsTable)
        .where(eq(approvalLimitsTable.companyId, companyId));
      const approverRole = String(req.userRole ?? "");
      const ok = canApproveAmount(
        approverRole,
        String(request.estimatedAmount ?? "0"),
        limits.map((l) => ({ role: l.role, maxAmount: l.maxAmount })),
      );
      if (!ok) {
        res.status(403).json({ error: "Недостаточно полномочий для согласования этой суммы" });
        return;
      }
    }

    const [approval] = await db
      .insert(supplyApprovalsTable)
      .values({
        requestId: id,
        approverId: req.userId!,
        status,
        comment: req.body?.comment ? String(req.body.comment) : null,
        approvedAt: status === "approved" ? new Date() : null,
      })
      .returning();

    if (status === "approved" || status === "rejected") {
      const event = status === "approved" ? ({ type: "approve" } as const) : ({ type: "reject" } as const);
      let next: string;
      try {
        next = nextRequestStatus(request.status as never, event);
      } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : "Недопустимый переход" });
        return;
      }
      await db.update(supplyRequestsTable).set({ status: next }).where(eq(supplyRequestsTable.id, id));
    }
    res.status(201).json(approval);
```

Примечание: если `req.userRole` в проекте называется иначе — использовать фактическое поле роли из `AuthenticatedRequest` (проверить тип в `middleware/auth`). Если роль лежит в `req.user?.role`, взять оттуда.

- [ ] **Step 5: Проверить типы**

Run: `cd artifacts/api-server && npx tsc --noEmit`
Expected: без ошибок. Если ошибка на `req.userRole` — заменить на корректное поле роли из `AuthenticatedRequest` и повторить.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/supply.ts
git commit -m "feat(supply): старт-статус draft, submit, согласование по лимиту (S2)"
```

---

## Self-Review (выполнено при написании плана)

- **Покрытие S2:** статус-машина заявки = Task 1; лимиты согласования = Task 2 (+ проводка Task 4 step 4); объект обязателен + старт draft = Task 4 steps 2; сумма заявки = Task 3; отправка на согласование = Task 4 step 3.
- **Плейсхолдеры:** нет — код/команды конкретны. Единственная явная адаптация: имя поля роли в `AuthenticatedRequest` (Task 4 step 4/5) — проверяется через `tsc` и указано, где смотреть.
- **Согласованность типов:** `RequestStatus`/`RequestEvent` (Task 1) и `canApproveAmount(approverRole, amount, limits)`/`ApprovalLimit` (Task 2) используются в Task 4 без расхождений. `estimatedAmount` (Task 3) читается в Task 4.
- **Проверяемость:** Tasks 1–2 — юнит-тесты (реальная логика). Tasks 3–4 — `tsc --noEmit` + ревью; БД-рантайм отложен (нет Postgres), как и в S0+S1.
- **Вне объёма:** полный расщеп роутов на сервис-слой (нужен запуск приложения); авто-расчёт суммы заявки по ценам (S3).
