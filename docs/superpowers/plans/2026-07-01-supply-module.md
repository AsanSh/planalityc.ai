# Модуль «Снабжение / Закуп» — мастер-план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: используй superpowers:subagent-driven-development или superpowers:executing-plans для реализации по задачам. Шаги помечены чекбоксами (`- [ ]`).

**Goal:** достроить существующий модуль снабжения до сквозного контура «потребность → закупка → многоуровневый склад/перемещение → передача подрядчику → списание → выгрузка в 1С», с мобильной приёмкой у прораба.

**Architecture:** строим **поверх** существующих таблиц (`supply_requests`, `supply_orders`, `warehouse_incoming/outgoing`, `marketplace_products`), не ломая их. Вся нетривиальная логика (остатки по складам, расхождения приёмки, резервирование, генерация XML для 1С) выносится в чистые функции `artifacts/api-server/src/lib/*` с юнит-тестами (`tsx --test`), роут-хендлеры остаются тонкими. Схема правится через `drizzle-kit generate`, таблицы экспортируются из `schema/index.ts`, роуты подключаются в `routes/index.ts`, страницы — в `App.tsx`.

**Tech Stack:** Express 5 + Drizzle ORM (Postgres/Neon), Zod (drizzle-zod), React + Vite + TanStack Query, orval api-client. Тесты — node test runner через `tsx --test src/**/*.test.ts`.

---

## Разбиение на планы (4 фазы = 4 плана)

Модуль покрывает 4 независимых подсистемы. Каждая фаза — самостоятельный, работающий и тестируемый инкремент. Строим по порядку — каждая следующая опирается на предыдущую.

| Фаза | Название | Зависит от | Статус плана |
|------|----------|-----------|--------------|
| **1** | Многоуровневые склады + перемещения + резервирование + мобильная приёмка | — | **детализирован ниже** |
| **2** | Финсогласование и оплата заказа (approved_by_finance → sent_to_payment → paid), матрица лимитов | 1 (склад как приёмник оплаченного) | архитектура ниже |
| **3** | Разбиение заявки «со склада / докупить», партионный учёт (батчи по цене) | 1 | архитектура ниже |
| **4** | Передача подрядчику → АВР → сверка ПТО → акт списания → выгрузка XML в 1С | 1, 3 | архитектура ниже |

> Правило планирования: фазы 2–4 разворачиваются в собственные детальные планы **перед** реализацией. Ниже по ним — durable-архитектура (схемы, эндпоинты, страницы), достаточная чтобы Фаза 1 заложила правильный фундамент.

---

## Целевая доменная модель (все фазы)

```
warehouses (НОВОЕ)                     ← центральный / объектный / прорабский склад
  └─ warehouse_stock (НОВОЕ)           ← остаток+резерв по паре (склад, позиция)
       └─ warehouse_stock_batches (Ф3) ← партии по цене поступления

supply_requests ─┬─ supply_request_items (+ fulfillMode: stock|purchase — Ф3)
                 └─ supply_approvals (+ role/step — Ф2)

supply_orders (+ paymentStatus, financeApprovedBy — Ф2)
  └─ supply_order_items (НОВОЕ — Ф3, строки заказа для сверки приёмки)

warehouse_incoming (+ orderItemId, qtyOrdered → расхождения — Ф3)
warehouse_transfers (НОВОЕ — Ф1) ─ warehouse_transfer_items (НОВОЕ — Ф1)
contractor_handovers (НОВОЕ — Ф4) ─ contractor_handover_items
work_acts / АВР (НОВОЕ — Ф4) ─ work_act_materials
material_writeoffs (НОВОЕ — Ф4) ─ material_writeoff_items
accounting_exports (НОВОЕ — Ф4)  ← пакет + статус exported_to_1c + xml blob
```

---

# ФАЗА 1 — Многоуровневые склады + перемещения (детальный план)

**Goal:** ввести сущность склада (центральный / объектный / прорабский), хранить остатки **по каждому складу** с резервом, документально перемещать материалы между складами, принимать перемещение с телефона с фиксацией расхождений.

**Architecture:** новая таблица `warehouses` + `warehouse_stock` (остаток и резерв на пару склад×позиция). Существующий `warehouse_items.currentStock` остаётся для обратной совместимости, но истина о наличии переезжает в `warehouse_stock`; при миграции для каждой компании создаётся склад типа `central` и остатки переносятся туда. Перемещение — документ `warehouse_transfers` + строки, со статусами `draft → in_transit → received | received_with_discrepancy`. Вся арифметика (валидация перемещения, расчёт расхождений, резервирование) — чистые функции в `lib/warehouse-stock.ts` с тестами.

### File Structure (Фаза 1)

- Create: `artifacts/api-server/src/lib/db/schema/warehouses.ts` — таблицы `warehouses`, `warehouse_stock`
- Create: `artifacts/api-server/src/lib/db/schema/warehouse_transfers.ts` — `warehouse_transfers`, `warehouse_transfer_items`
- Modify: `artifacts/api-server/src/lib/db/schema/index.ts` — экспорт новых схем
- Create: `artifacts/api-server/src/lib/warehouse-stock.ts` — чистая логика (delta/резерв/расхождения/допустимые переходы)
- Create: `artifacts/api-server/src/lib/warehouse-stock.test.ts` — юнит-тесты
- Create: `artifacts/api-server/src/routes/warehouse-transfers.ts` — CRUD перемещений + приёмка
- Modify: `artifacts/api-server/src/routes/warehouse.ts` — эндпоинты складов и остатков по складам
- Modify: `artifacts/api-server/src/routes/index.ts` — подключить `warehouse-transfers`
- Create: `artifacts/api-server/drizzle/migrations/NNNN_*.sql` — через `drizzle-kit generate` (+ ручной data-backfill central-склада)
- Create: `artifacts/proptech/src/pages/warehouse/warehouses.tsx` — управление складами
- Create: `artifacts/proptech/src/pages/warehouse/transfers.tsx` — список/создание перемещений
- Create: `artifacts/proptech/src/pages/warehouse/transfer-receive.tsx` — мобильная приёмка (получил / с расхождением)
- Modify: `artifacts/proptech/src/App.tsx` — маршруты новых страниц
- Modify: `artifacts/proptech/src/lib/module-registry.ts` — `ownedEntities` procurement += warehouse, transfer

### Целевые схемы (concrete DDL — стиль репозитория)

```typescript
// warehouses.ts
export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("central"), // central | project | foreman | transit
  projectId: integer("project_id"),            // для project/foreman складов
  responsibleUserId: integer("responsible_user_id"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const warehouseStockTable = pgTable("warehouse_stock", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  reservedQuantity: numeric("reserved_quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  avgPrice: numeric("avg_price", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ uniqWarehouseItem: unique().on(t.warehouseId, t.itemId) }));
```

```typescript
// warehouse_transfers.ts
export const warehouseTransfersTable = pgTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  status: text("status").notNull().default("draft"), // draft | in_transit | received | received_with_discrepancy | cancelled
  documentNumber: text("document_number"),
  sentBy: integer("sent_by"),
  receivedBy: integer("received_by"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const warehouseTransferItemsTable = pgTable("warehouse_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantitySent: numeric("quantity_sent", { precision: 14, scale: 3 }).notNull().default("0"),
  quantityReceived: numeric("quantity_received", { precision: 14, scale: 3 }),
  notes: text("notes"),
});
```

---

### Task 1: Чистая логика склада (переходы, резерв, расхождения)

**Files:**
- Create: `artifacts/api-server/src/lib/warehouse-stock.ts`
- Test: `artifacts/api-server/src/lib/warehouse-stock.test.ts`

- [ ] **Step 1: Написать падающий тест**

```typescript
// warehouse-stock.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTransferAllowed,
  availableToReserve,
  computeTransferReceipt,
  type TransferLine,
} from "./warehouse-stock";

test("isTransferAllowed: нельзя перемещать в тот же склад", () => {
  assert.equal(isTransferAllowed({ id: 1, type: "central" }, { id: 1, type: "central" }), false);
});

test("isTransferAllowed: central → project разрешён", () => {
  assert.equal(isTransferAllowed({ id: 1, type: "central" }, { id: 2, type: "project" }), true);
});

test("availableToReserve: остаток минус уже зарезервированное", () => {
  assert.equal(availableToReserve("100", "30"), 70);
});

test("availableToReserve: не уходит в минус", () => {
  assert.equal(availableToReserve("10", "25"), 0);
});

test("computeTransferReceipt: полное совпадение — статус received", () => {
  const lines: TransferLine[] = [{ itemId: 5, quantitySent: "100", quantityReceived: "100" }];
  const r = computeTransferReceipt(lines);
  assert.equal(r.status, "received");
  assert.equal(r.discrepancies.length, 0);
});

test("computeTransferReceipt: недопоставка — расхождение и статус received_with_discrepancy", () => {
  const lines: TransferLine[] = [{ itemId: 5, quantitySent: "100", quantityReceived: "90" }];
  const r = computeTransferReceipt(lines);
  assert.equal(r.status, "received_with_discrepancy");
  assert.deepEqual(r.discrepancies, [{ itemId: 5, sent: 100, received: 90, delta: -10 }]);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/warehouse-stock.test.ts`
Expected: FAIL — `Cannot find module './warehouse-stock'`

- [ ] **Step 3: Реализация**

```typescript
// warehouse-stock.ts
export type WarehouseType = "central" | "project" | "foreman" | "transit";
export interface WarehouseRef { id: number; type: WarehouseType }
export interface TransferLine { itemId: number; quantitySent: string; quantityReceived?: string | null }
export interface Discrepancy { itemId: number; sent: number; received: number; delta: number }
export interface ReceiptResult { status: "received" | "received_with_discrepancy"; discrepancies: Discrepancy[] }

export function isTransferAllowed(from: WarehouseRef, to: WarehouseRef): boolean {
  return from.id !== to.id;
}

export function availableToReserve(quantity: string, reserved: string): number {
  return Math.max(0, Number(quantity) - Number(reserved));
}

export function computeTransferReceipt(lines: TransferLine[]): ReceiptResult {
  const discrepancies: Discrepancy[] = [];
  for (const l of lines) {
    const sent = Number(l.quantitySent);
    const received = Number(l.quantityReceived ?? l.quantitySent);
    if (received !== sent) discrepancies.push({ itemId: l.itemId, sent, received, delta: received - sent });
  }
  return { status: discrepancies.length ? "received_with_discrepancy" : "received", discrepancies };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/warehouse-stock.test.ts`
Expected: PASS (все тесты зелёные)

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/warehouse-stock.ts artifacts/api-server/src/lib/warehouse-stock.test.ts
git commit -m "feat(supply): чистая логика склада — переходы, резерв, расхождения приёмки"
```

---

### Task 2: Схемы warehouses + warehouse_stock

**Files:**
- Create: `artifacts/api-server/src/lib/db/schema/warehouses.ts`
- Modify: `artifacts/api-server/src/lib/db/schema/index.ts`

- [ ] **Step 1:** Создать `warehouses.ts` c таблицами `warehousesTable`, `warehouseStockTable` (DDL выше), плюс `createInsertSchema(...).omit({ id, createdAt, updatedAt })` и типы `Insert*`/`*` по образцу `warehouse_items.ts`. Импорты: `pgTable, serial, integer, text, timestamp, numeric, boolean, unique` из `drizzle-orm/pg-core`, `createInsertSchema` из `drizzle-zod`, `z` из `zod/v4`.

- [ ] **Step 2:** В `schema/index.ts` после строки `export * from "./warehouse_items";` добавить:

```typescript
export * from "./warehouses";
export * from "./warehouse_transfers";
```

- [ ] **Step 3:** Проверить компиляцию: `cd artifacts/api-server && npm run typecheck` → без ошибок по новым файлам.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/lib/db/schema/warehouses.ts artifacts/api-server/src/lib/db/schema/index.ts
git commit -m "feat(supply): схемы warehouses и warehouse_stock"
```

---

### Task 3: Схема warehouse_transfers

**Files:** Create `artifacts/api-server/src/lib/db/schema/warehouse_transfers.ts`

- [ ] **Step 1:** Создать файл c `warehouseTransfersTable` и `warehouseTransferItemsTable` (DDL выше) + insert-схемы и типы по образцу.
- [ ] **Step 2:** `npm run typecheck` → чисто.
- [ ] **Step 3: Commit** `git commit -m "feat(supply): схема перемещений между складами"`

---

### Task 4: Миграция + backfill центрального склада

**Files:** Create `artifacts/api-server/drizzle/migrations/NNNN_supply_warehouses.sql`

- [ ] **Step 1:** Сгенерировать структурную миграцию:

Run: `cd artifacts/api-server && npm run db:generate`
Expected: новый `.sql` в `drizzle/migrations/` с `CREATE TABLE warehouses/warehouse_stock/warehouse_transfers/...`

- [ ] **Step 2:** В конец сгенерированного `.sql` дописать backfill (идемпотентно):

```sql
-- Создать центральный склад для каждой компании, у которой его ещё нет
INSERT INTO warehouses (company_id, name, type, is_active)
SELECT DISTINCT wi.company_id, 'Центральный склад', 'central', true
FROM warehouse_items wi
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.company_id = wi.company_id AND w.type = 'central'
);

-- Перенести текущие остатки позиций на центральный склад компании
INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, avg_price)
SELECT wi.company_id, w.id, wi.id, COALESCE(wi.current_stock, '0'), COALESCE(wi.unit_price, '0')
FROM warehouse_items wi
JOIN warehouses w ON w.company_id = wi.company_id AND w.type = 'central'
ON CONFLICT (warehouse_id, item_id) DO NOTHING;
```

- [ ] **Step 3:** Применить локально/на staging: `npm run db:migrate` (миграции также самозаживают при деплое — см. `api-deploy-and-db` memory). Проверить: `warehouse_stock` заполнен, суммы совпадают с `warehouse_items.current_stock`.
- [ ] **Step 4: Commit** `git commit -m "feat(supply): миграция складов + backfill остатков на центральный склад"`

---

### Task 5: API складов и остатков по складам

**Files:** Modify `artifacts/api-server/src/routes/warehouse.ts`

- [ ] **Step 1:** Добавить эндпоинты (тонкие хендлеры, скоуп по `companyId` из `req` как в существующих):
  - `GET  /warehouse/warehouses` — список складов компании (фильтр `?type=`, `?projectId=`)
  - `POST /warehouse/warehouses` — создать (валидация `insertWarehouseSchema`)
  - `PATCH /warehouse/warehouses/:id` — переименовать/деактивировать/сменить ответственного
  - `GET  /warehouse/stock?warehouseId=` — остатки по складу (join `warehouse_items` для имени/ед.изм., отдавать `available = quantity - reservedQuantity`)
- [ ] **Step 2:** Ручная проверка через `curl`/Thunder на dev-сервере: создать склад типа `project`, увидеть его в списке, увидеть перенесённые остатки центрального склада.
- [ ] **Step 3: Commit** `git commit -m "feat(supply): API складов и остатков по складам"`

---

### Task 6: API перемещений + приёмка (использует чистую логику Task 1)

**Files:** Create `artifacts/api-server/src/routes/warehouse-transfers.ts`; Modify `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1:** Реализовать эндпоинты:
  - `GET  /warehouse/transfers` — список (фильтры `?status=`, `?warehouseId=`)
  - `POST /warehouse/transfers` — создать draft: шапка + строки; проверить `isTransferAllowed(from, to)` (иначе 400); проверить, что на `fromWarehouse` хватает `availableToReserve` по каждой строке.
  - `POST /warehouse/transfers/:id/send` — статус `in_transit`: списать `quantitySent` с `warehouse_stock` склада-источника (в транзакции), проставить `sentAt/sentBy`.
  - `POST /warehouse/transfers/:id/receive` — принять: тело `{ items: [{ itemId, quantityReceived }] }`; вызвать `computeTransferReceipt`; зачислить `quantityReceived` на склад-получатель (upsert `warehouse_stock`, пересчёт `avgPrice`); статус `received | received_with_discrepancy`; проставить `receivedAt/receivedBy`; журнал расхождений вернуть в ответе.
- [ ] **Step 2:** В `routes/index.ts` — `import warehouseTransfersRouter from "./warehouse-transfers";` и `router.use(warehouseTransfersRouter);` рядом с `warehouseRouter`.
- [ ] **Step 3:** Проверка сценария на dev: central(100) → project: send → на central 0, статус in_transit → receive 90 → на project 90, статус `received_with_discrepancy`, в ответе `delta: -10`.
- [ ] **Step 4: Commit** `git commit -m "feat(supply): перемещения между складами с приёмкой и учётом расхождений"`

---

### Task 7: Страница «Склады»

**Files:** Create `artifacts/proptech/src/pages/warehouse/warehouses.tsx`; Modify `artifacts/proptech/src/App.tsx`

- [ ] **Step 1:** Страница по образцу `warehouse/items.tsx`: таблица складов (имя, тип-бейдж, проект, ответственный, активность), кнопка «Добавить склад» с формой (name, type-select, project-select для project/foreman, ответственный). Данные — TanStack Query на `/warehouse/warehouses`.
- [ ] **Step 2:** В `App.tsx`: `import WarehouseWarehouses from "@/pages/warehouse/warehouses";` и маршрут `/warehouse/warehouses` рядом с прочими warehouse-маршрутами.
- [ ] **Step 3:** Проверка через preview (`preview_start` → `/warehouse/warehouses`): список рендерится, добавление создаёт склад.
- [ ] **Step 4: Commit** `git commit -m "feat(supply): страница управления складами"`

---

### Task 8: Страница перемещений + мобильная приёмка

**Files:** Create `artifacts/proptech/src/pages/warehouse/transfers.tsx`, `transfer-receive.tsx`; Modify `App.tsx`

- [ ] **Step 1:** `transfers.tsx` — список перемещений со статус-бейджами и кнопкой «Создать перемещение» (from/to склады, добавление строк из остатков источника).
- [ ] **Step 2:** `transfer-receive.tsx` — **мобильный** экран приёмки: крупные строки, на каждую — «получено полностью» / поле фактического количества, кнопки «Принять» / «Принять с расхождением», комментарий. Верстать mobile-first (проверить `preview_resize preset=mobile`).
- [ ] **Step 3:** Маршруты `/warehouse/transfers` и `/warehouse/transfers/:id/receive` в `App.tsx`.
- [ ] **Step 4:** Проверка через preview на desktop и mobile: создать перемещение, принять с недостачей, увидеть расхождение.
- [ ] **Step 5: Commit** `git commit -m "feat(supply): перемещения и мобильная приёмка прораба"`

---

### Task 9: Регистрация в реестре модулей

**Files:** Modify `artifacts/proptech/src/lib/module-registry.ts`

- [ ] **Step 1:** В блоке procurement добавить в `ownedEntities`: `"warehouse"`, `"warehouseStock"`, `"transfer"`. Проверить, что `routePrefixes` procurement уже покрывает `/warehouse` (если нет — добавить).
- [ ] **Step 2:** Запустить фронт-тесты реестра/маршрутов: `cd artifacts/proptech && npx vitest run src/lib/module-registry.test.ts src/lib/routes-audit.test.ts` (если vitest; иначе действующий тест-раннер фронта).
- [ ] **Step 3: Commit** `git commit -m "chore(supply): регистрация сущностей складов в реестре модулей"`

---

### Фаза 1 — Self-review checklist

- [ ] Остатки: суммарно по `warehouse_stock` = прежний `warehouse_items.current_stock` после backfill.
- [ ] Перемещение нельзя создать в тот же склад и на количество больше доступного.
- [ ] Приёмка с недостачей ставит `received_with_discrepancy` и пишет расхождение.
- [ ] Мобильный экран приёмки читаем на 375px.
- [ ] `npm run typecheck` (api) и билд фронта — зелёные.

---

# ФАЗА 2 — Финсогласование и оплата (архитектура)

**Разрывы:** у `supply_orders` нет статуса оплаты и шага финдира; нет матрицы лимитов согласования.

**Схема (изменения `supply.ts`):**
- `supply_orders` += `paymentStatus text default 'none'` (`none | pending_finance | approved_by_finance | sent_to_payment | paid_partially | paid | payment_rejected`), `financeApprovedBy integer`, `financeApprovedAt timestamp`, `paidAmount numeric`.
- Новая `supply_payment_requests` (заявка на оплату по заказу: сумма, тип аванс/постоплата, срок, реквизиты, статус) — или переиспользовать существующий финансовый модуль платежей (проверить `payment_allocations`, `expenses`).
- Новая `approval_limits` (companyId, role, maxAmount) — матрица: до N сом утверждает один, выше — финдир/директор.

**Эндпоинты:** `POST /supply/orders/:id/submit-to-finance`, `POST /supply/orders/:id/finance-approve`, `POST /supply/orders/:id/send-to-payment`, `POST /supply/orders/:id/register-payment`; CRUD `/supply/approval-limits`.

**Чистая логика (тестируемая):** `resolveApprovers(amount, limits)` → кто должен согласовать; `nextPaymentStatus(current, event)` → машина статусов оплаты.

**Страницы:** очередь финсогласования (`warehouse/finance-queue.tsx`), настройка матрицы лимитов в `warehouse/settings.tsx`.

---

# ФАЗА 3 — Разбиение заявки и партионный учёт (архитектура)

**Разрывы:** заявку нельзя разбить «выдать со склада / докупить»; нет резервирования при одобрении выдачи; нет партий по цене; приёмка не сверяется со строкой заказа.

**Схема:**
- `supply_request_items` += `fulfillMode text default 'auto'` (`auto | from_stock | purchase`), `reservedWarehouseId integer`.
- Новая `supply_order_items` (orderId, itemId, qtyOrdered, unitPrice) — чтобы приёмка сверялась построчно.
- `warehouse_incoming` += `orderItemId integer`, `qtyOrdered numeric` → расхождение заказано/пришло/брак.
- Новая `warehouse_stock_batches` (warehouseId, itemId, incomingId, qty, unitPrice, receivedAt) — партионный учёт; `warehouse_stock.avgPrice` пересчитывается из батчей.

**Чистая логика:** `splitRequestItem(available, needed)` → {fromStock, toPurchase}; `weightedAvgPrice(batches)`; `consumeBatchesFIFO(batches, qty)` → какие партии и по какой цене списать.

**Эндпоинты:** `POST /supply/requests/:id/plan` (ПТО делит на выдать/докупить + резервирует); расширение `POST /warehouse/incoming` для привязки к `orderItemId`.

**Страницы:** доработка `warehouse/approvals.tsx` (ПТО видит остаток и ставит режим по каждой позиции), badge «в резерве» на остатках.

---

# ФАЗА 4 — Подрядчик → АВР → списание → 1С (архитектура)

**Разрывы:** нет документа передачи подрядчику, АВР, акта списания, выгрузки XML в 1С.

**Схема:**
- `contractor_handovers` (companyId, projectId, contractorId, fromWarehouseId, status, handedBy, acceptedBy, dates) + `contractor_handover_items` (itemId, quantity) — списывает со склада прораба, вешает «у подрядчика».
- `work_acts` — АВР (companyId, projectId, contractorId, stageId, period, workVolume, status `draft|submitted|pto_review|approved|rejected`) + `work_act_materials` (itemId, normQuantity, factQuantity) — ПТО сверяет факт с нормой/передачей.
- `material_writeoffs` (companyId, projectId, basis `work_act|self_build`, workActId, status) + `material_writeoff_items` (itemId, quantity, batchId, amount) — списание по FIFO-партиям (Ф3).
- `accounting_exports` (companyId, kind `writeoff|incoming|handover`, refId, status `ready|exported|accepted|needs_correction`, xmlBlobUrl, exportedAt).

**Чистая логика (ключевая для 1С):** `buildCommerceMLWriteoff(act, materials, entity)` → строка XML формата **CommerceML 2** (стандарт обмена 1С), с тестом на валидность структуры и экранирование (образец экранирования уже есть в `lib/sms.ts::xmlEscape`, `contract-annex1-docx.ts`). Сверка АВР: `reconcileWorkAct(norm, fact, handed)` → отклонения по каждому материалу.

**Эндпоинты:** CRUD `/supply/handovers`, `/supply/work-acts` (+ `/submit`, `/pto-approve`), `/supply/writeoffs`; `GET /supply/exports/:id/xml` — отдаёт `.xml` (`Content-Type: application/xml`, статус `exported_to_1c`).

**Страницы:** `warehouse/handovers.tsx`, `construction/work-acts.tsx` (сверка ПТО), `warehouse/writeoffs.tsx`, `warehouse/accounting-export.tsx` (кнопка «Выгрузить в 1С» → скачивание XML + смена статуса).

---

## Открытые продуктовые развилки (решить до Фазы 3–4)

1. **Партионный учёт** — FIFO (первым пришёл — первым списан) или средневзвешенная цена? План закладывает батчи (Ф3) и FIFO-списание (Ф4); если бухгалтерия работает по средней — упрощаем до `avgPrice`.
2. **Формат 1С** — CommerceML 2 (универсальный) vs выгрузка под конкретную конфигурацию (УТ/БП/Бухгалтерия для КР). Нужен образец XML, который принимает их 1С, — иначе структура угадывается.
3. **Оплата** — свой контур `supply_payment_requests` или интеграция в существующий финмодуль (`expenses`/`payment_allocations`). Влияет на Фазу 2.
