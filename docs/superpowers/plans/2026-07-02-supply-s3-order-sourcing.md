# S3 Сбор заказа: мультиобъектный сорсинг + позиции + цены — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Steps use `- [ ]`.

**Goal:** Снабженец собирает заказ: часть закрывается со своего объекта, часть — изъятием с других объектов, остаток — докупить; позиции заказа хранятся с ценами.

**Architecture:** Чистая логика в `supply-sourcing.ts` (`planMultiObjectSourcing`, `priceOrderLines`) — без БД, юнит-тесты. Таблица `supply_order_items` — позиции заказа из «докупить», цена из прайса поставщика.

**Tech Stack:** TypeScript, Drizzle, Postgres, `node:test`, tsx.

**Родитель:** [2026-07-02-supply-construction-architecture.md](../specs/2026-07-02-supply-construction-architecture.md) — S3.

## Решения S3
- Сорсинг жадный: сначала свой объект, затем другие объекты в переданном порядке (приоритет — на стороне вызывающего), остаток — к покупке.
- Позиции заказа (`supply_order_items`) собираются из части «докупить»; цена — из `supplier_products.price` (авто), может переопределяться вручную позже.

## Вне объёма S3 (нужен рантайм / позже)
- Route-оркестрация сборки заказа (эндпоинт, транзакции, резерв перемещений) — требует запущенного приложения/Postgres для проверки; делается после деплоя staging.
- Сам механизм межобъектного перемещения (`warehouse_transfers`) уже существует — S3 только считает, откуда брать.

---

## File Structure
- Create `artifacts/api-server/src/lib/supply-sourcing.ts` (+ `.test.ts`).
- Create `artifacts/api-server/drizzle/migrations/0053_supply_order_items.sql`.
- Modify `artifacts/api-server/src/lib/db/schema/supply.ts` — таблица `supplyOrderItemsTable` + типы.
- Modify `artifacts/api-server/src/lib/migrate.ts` — регистрация 0053.

---

## Task 1: Чистый мультиобъектный сорсинг

**Files:**
- Create: `artifacts/api-server/src/lib/supply-sourcing.ts`
- Test: `artifacts/api-server/src/lib/supply-sourcing.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `artifacts/api-server/src/lib/supply-sourcing.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planMultiObjectSourcing,
  type OtherObjectStock,
} from "./supply-sourcing";

const others: OtherObjectStock[] = [
  { warehouseId: 2, available: 3 },
  { warehouseId: 3, available: 10 },
];

test("хватает своего объекта — только fromOwn", () => {
  assert.deepEqual(planMultiObjectSourcing(5, 8, others), {
    fromOwn: 5,
    fromOthers: [],
    toPurchase: 0,
  });
});

test("добираем с других объектов по порядку", () => {
  // нужно 10, своё 4 → остаток 6: 3 со склада 2, 3 со склада 3
  assert.deepEqual(planMultiObjectSourcing(10, 4, others), {
    fromOwn: 4,
    fromOthers: [
      { warehouseId: 2, qty: 3 },
      { warehouseId: 3, qty: 3 },
    ],
    toPurchase: 0,
  });
});

test("остаток идёт в докупить", () => {
  // нужно 30, своё 4, другие дают 3+10=13 → toPurchase 13
  assert.deepEqual(planMultiObjectSourcing(30, 4, others), {
    fromOwn: 4,
    fromOthers: [
      { warehouseId: 2, qty: 3 },
      { warehouseId: 3, qty: 10 },
    ],
    toPurchase: 13,
  });
});

test("отрицательные остатки трактуются как 0", () => {
  assert.deepEqual(planMultiObjectSourcing(5, -2, [{ warehouseId: 9, available: -1 }]), {
    fromOwn: 0,
    fromOthers: [],
    toPurchase: 5,
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-sourcing.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать модуль**

Создать `artifacts/api-server/src/lib/supply-sourcing.ts`:

```ts
/**
 * Чистая логика сбора заказа снабжения (S3): мультиобъектный сорсинг и цены.
 * Без БД.
 */

export interface OtherObjectStock {
  warehouseId: number;
  available: number;
}

export interface SourcingResult {
  fromOwn: number;
  fromOthers: Array<{ warehouseId: number; qty: number }>;
  toPurchase: number;
}

/**
 * Разложить потребность: сначала свой объект, затем другие объекты в переданном
 * порядке, остаток — к покупке. Отрицательные остатки трактуются как 0.
 */
export function planMultiObjectSourcing(
  needed: number,
  ownAvailable: number,
  others: OtherObjectStock[],
): SourcingResult {
  let remaining = Math.max(0, needed);
  const fromOwn = Math.min(Math.max(0, ownAvailable), remaining);
  remaining -= fromOwn;
  const fromOthers: Array<{ warehouseId: number; qty: number }> = [];
  for (const o of others) {
    if (remaining <= 0) break;
    const take = Math.min(Math.max(0, o.available), remaining);
    if (take > 0) {
      fromOthers.push({ warehouseId: o.warehouseId, qty: take });
      remaining -= take;
    }
  }
  return { fromOwn, fromOthers, toPurchase: remaining };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит (4 теста)**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-sourcing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/supply-sourcing.ts artifacts/api-server/src/lib/supply-sourcing.test.ts
git commit -m "feat(supply): мультиобъектный сорсинг заказа (S3)"
```

---

## Task 2: Чистое ценообразование позиций заказа

**Files:**
- Modify: `artifacts/api-server/src/lib/supply-sourcing.ts` (добавить функцию)
- Modify: `artifacts/api-server/src/lib/supply-sourcing.test.ts` (добавить тесты)

- [ ] **Step 1: Дописать падающие тесты**

В конец `artifacts/api-server/src/lib/supply-sourcing.test.ts` добавить:

```ts
import { priceOrderLines, type OrderLineInput } from "./supply-sourcing";

const lines: OrderLineInput[] = [
  { productId: 1, quantity: 2 },
  { productId: 2, quantity: 5 },
  { productId: 3, quantity: 1 },
];

test("считает суммы позиций и итог по прайсу", () => {
  const res = priceOrderLines(lines, { 1: 100, 2: 50 });
  assert.deepEqual(res.lines, [
    { productId: 1, quantity: 2, unitPrice: 100, lineTotal: 200 },
    { productId: 2, quantity: 5, unitPrice: 50, lineTotal: 250 },
    { productId: 3, quantity: 1, unitPrice: 0, lineTotal: 0 }, // нет цены → 0
  ]);
  assert.equal(res.total, 450);
});

test("пустой список → total 0", () => {
  assert.deepEqual(priceOrderLines([], {}), { lines: [], total: 0 });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-sourcing.test.ts`
Expected: FAIL — `priceOrderLines` не экспортирована.

- [ ] **Step 3: Реализовать функцию**

В конец `artifacts/api-server/src/lib/supply-sourcing.ts` добавить:

```ts
export interface OrderLineInput {
  productId: number;
  quantity: number;
}

export interface PricedLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Проставить цены позициям заказа по прайсу (productId → цена). Нет цены → 0.
 * Возвращает позиции с суммами и общий итог.
 */
export function priceOrderLines(
  lines: OrderLineInput[],
  priceByProductId: Record<number, number>,
): { lines: PricedLine[]; total: number } {
  const priced: PricedLine[] = lines.map((l) => {
    const unitPrice = priceByProductId[l.productId] ?? 0;
    return { productId: l.productId, quantity: l.quantity, unitPrice, lineTotal: unitPrice * l.quantity };
  });
  const total = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  return { lines: priced, total };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/supply-sourcing.test.ts`
Expected: PASS — 6 тестов (4 сорсинга + 2 цены).

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/supply-sourcing.ts artifacts/api-server/src/lib/supply-sourcing.test.ts
git commit -m "feat(supply): ценообразование позиций заказа (S3)"
```

---

## Task 3: Таблица позиций заказа (supply_order_items)

**Files:**
- Create: `artifacts/api-server/drizzle/migrations/0053_supply_order_items.sql`
- Modify: `artifacts/api-server/src/lib/db/schema/supply.ts`
- Modify: `artifacts/api-server/src/lib/migrate.ts`

- [ ] **Step 1: Написать миграцию**

Создать `artifacts/api-server/drizzle/migrations/0053_supply_order_items.sql`:

```sql
-- Migration: позиции заказа снабжения (S3). Idempotent.
-- Заказ строится из части «докупить» позиций заявки; цена из прайса поставщика.

CREATE TABLE IF NOT EXISTS supply_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  request_item_id INTEGER,
  global_product_id INTEGER,
  supplier_product_id INTEGER,
  custom_name TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'шт',
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supply_order_items_order_idx ON supply_order_items (order_id);
```

- [ ] **Step 2: Добавить таблицу в drizzle-схему**

В `artifacts/api-server/src/lib/db/schema/supply.ts` после определения `supplyOrdersTable` добавить (стиль как у соседних таблиц; `pgTable, serial, integer, text, timestamp, numeric` уже импортированы в этом файле):

```ts
/** Позиции заказа снабжения (из части «докупить», с ценой поставщика). */
export const supplyOrderItemsTable = pgTable("supply_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  requestItemId: integer("request_item_id"),
  globalProductId: integer("global_product_id"),
  supplierProductId: integer("supplier_product_id"),
  customName: text("custom_name"),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull().default("шт"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

И в конце файла, рядом с другими экспортами типов, добавить:

```ts
export const insertSupplyOrderItemSchema = createInsertSchema(supplyOrderItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupplyOrderItem = z.infer<typeof insertSupplyOrderItemSchema>;
export type SupplyOrderItem = typeof supplyOrderItemsTable.$inferSelect;
```

(`createInsertSchema` и `z` уже импортированы в этом файле.)

- [ ] **Step 3: Зарегистрировать миграцию**

В `artifacts/api-server/src/lib/migrate.ts` в конец массива `selfHeal` (после `"0052_supply_request_status_amount.sql"`) добавить:

```ts
"0053_supply_order_items.sql",
```

- [ ] **Step 4: Проверить типы**

Run: `cd artifacts/api-server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/drizzle/migrations/0053_supply_order_items.sql \
        artifacts/api-server/src/lib/db/schema/supply.ts \
        artifacts/api-server/src/lib/migrate.ts
git commit -m "feat(supply): таблица позиций заказа (S3 migration)"
```

---

## Self-Review (выполнено при написании)

- **Покрытие S3:** сорсинг = Task 1; цены = Task 2; позиции заказа = Task 3. Route-оркестрация явно вне объёма (нужен рантайм).
- **Плейсхолдеры:** нет.
- **Типы:** `OtherObjectStock`/`SourcingResult` (Task 1), `OrderLineInput`/`PricedLine` (Task 2), `SupplyOrderItem` (Task 3) — согласованы.
- **Проверяемость:** Tasks 1–2 юнит-тесты; Task 3 — `tsc`; БД-рантайм отложен (нет Postgres).
