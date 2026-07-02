# S0+S1 Фундамент (номенклатура + объектный учёт) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заложить фундамент связки Снабжение↔Стройка: единая номенклатура ссылается везде (+базовый шаблон данных) и остатки считаются по объектам строительства.

**Architecture:** Две независимые чистые либы (`nomenclature-match`, `object-stock`) с юнит-тестами на `node:test`; связка каталога с материалами стройки через новую колонку `construction_materials.global_product_id`; сид базовой номенклатуры и эндпоинт агрегированных остатков объекта. БД-изменения — idempotent SQL-миграции через self-heal.

**Tech Stack:** TypeScript, Express, Drizzle ORM, Postgres, `node:test`/`node:assert`, tsx.

**Родительский документ:** [2026-07-02-supply-construction-architecture.md](../specs/2026-07-02-supply-construction-architecture.md) (подсистемы S0, S1).

---

## File Structure

- Create `artifacts/api-server/drizzle/migrations/0050_construction_material_global_link.sql` — связка материалов стройки с каталогом.
- Create `artifacts/api-server/drizzle/migrations/0051_nomenclature_base_seed.sql` — базовый шаблон номенклатуры (категории + товары).
- Modify `artifacts/api-server/src/lib/migrate.ts` — регистрация миграций 0050, 0051 в массиве `selfHeal`.
- Modify `artifacts/api-server/src/lib/db/schema/construction_materials.ts` — колонка `globalProductId`.
- Create `artifacts/api-server/src/lib/nomenclature-match.ts` (+ `.test.ts`) — чистое сопоставление названия материала с каноническим товаром.
- Create `artifacts/api-server/src/lib/object-stock.ts` (+ `.test.ts`) — чистая агрегация остатков по объекту.
- Modify `artifacts/api-server/src/routes/warehouse.ts` — эндпоинт `GET /warehouse/objects/:projectId/stock`.

**Границы ответственности:** пуре-либы не знают про БД/Express; роут — тонкая обёртка; миграции — только add/seed, без удаления колонок.

---

## Task 1: Колонка связки материалов стройки с каталогом (S0)

**Files:**
- Create: `artifacts/api-server/drizzle/migrations/0050_construction_material_global_link.sql`
- Modify: `artifacts/api-server/src/lib/db/schema/construction_materials.ts`
- Modify: `artifacts/api-server/src/lib/migrate.ts`

- [ ] **Step 1: Написать миграцию**

Создать `artifacts/api-server/drizzle/migrations/0050_construction_material_global_link.sql`:

```sql
-- Migration: связка материалов стройки с единым каталогом (S0).
-- Позволяет ссылаться на канонический товар из construction_materials.
-- Idempotent (ADD COLUMN IF NOT EXISTS) — self-heal safe.

ALTER TABLE construction_materials ADD COLUMN IF NOT EXISTS global_product_id INTEGER;

CREATE INDEX IF NOT EXISTS construction_materials_global_product_idx
  ON construction_materials (company_id, global_product_id);
```

- [ ] **Step 2: Добавить колонку в drizzle-схему**

В `artifacts/api-server/src/lib/db/schema/construction_materials.ts`, внутри `constructionMaterialsTable`, после строки `supplierId: integer("supplier_id"),` добавить:

```ts
  globalProductId: integer("global_product_id"),
```

- [ ] **Step 3: Зарегистрировать миграцию в self-heal**

В `artifacts/api-server/src/lib/migrate.ts` в массиве `selfHeal` добавить в конец (после `"0049_warehouse_item_global_link.sql"`):

```ts
"0050_construction_material_global_link.sql",
```

- [ ] **Step 4: Проверить типы**

Run: `cd artifacts/api-server && npx tsc --noEmit`
Expected: без ошибок, связанных с `construction_materials`.

- [ ] **Step 5: Применить миграцию на локальном Postgres и проверить колонку**

Run:
```bash
cd artifacts/api-server && psql "$DATABASE_URL" -f drizzle/migrations/0050_construction_material_global_link.sql \
  && psql "$DATABASE_URL" -c "\d construction_materials" | grep global_product_id
```
Expected: строка `global_product_id | integer`.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/drizzle/migrations/0050_construction_material_global_link.sql \
        artifacts/api-server/src/lib/db/schema/construction_materials.ts \
        artifacts/api-server/src/lib/migrate.ts
git commit -m "feat(supply): связка материалов стройки с единым каталогом (S0)"
```

---

## Task 2: Чистое сопоставление названия с каноническим товаром (S0)

**Files:**
- Create: `artifacts/api-server/src/lib/nomenclature-match.ts`
- Test: `artifacts/api-server/src/lib/nomenclature-match.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `artifacts/api-server/src/lib/nomenclature-match.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchGlobalProductId,
  normalizeName,
  type GlobalProductRef,
  type AliasRef,
} from "./nomenclature-match";

const products: GlobalProductRef[] = [
  { id: 1, canonicalName: "Цемент М500", slug: "cement-m500" },
  { id: 2, canonicalName: "Песок речной", slug: "pesok-rechnoy" },
];
const aliases: AliasRef[] = [{ globalProductId: 1, alias: "Портландцемент М500" }];

test("нормализация: регистр и лишние пробелы", () => {
  assert.equal(normalizeName("  Цемент   М500 "), "цемент м500");
});

test("точное совпадение по canonicalName (без учёта регистра/пробелов)", () => {
  assert.equal(matchGlobalProductId("цемент м500", products, aliases), 1);
});

test("совпадение по синониму", () => {
  assert.equal(matchGlobalProductId("Портландцемент М500", products, aliases), 1);
});

test("нет совпадения → null", () => {
  assert.equal(matchGlobalProductId("Арматура А500", products, aliases), null);
});

test("пустое имя → null", () => {
  assert.equal(matchGlobalProductId("   ", products, aliases), null);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/nomenclature-match.test.ts`
Expected: FAIL — модуль `./nomenclature-match` не найден.

- [ ] **Step 3: Реализовать модуль**

Создать `artifacts/api-server/src/lib/nomenclature-match.ts`:

```ts
/**
 * Чистое сопоставление свободного названия материала с каноническим товаром
 * единого каталога (S0). Приоритет: точное имя → синоним.
 */

export interface GlobalProductRef {
  id: number;
  canonicalName: string;
  slug: string;
}

export interface AliasRef {
  globalProductId: number;
  alias: string;
}

/** Нормализация: trim, нижний регистр, схлопнуть внутренние пробелы. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Вернуть globalProductId для свободного названия или null.
 * Сопоставление регистронезависимое и устойчивое к лишним пробелам.
 */
export function matchGlobalProductId(
  name: string,
  products: GlobalProductRef[],
  aliases: AliasRef[],
): number | null {
  const n = normalizeName(name);
  if (!n) return null;
  const direct = products.find((p) => normalizeName(p.canonicalName) === n);
  if (direct) return direct.id;
  const alias = aliases.find((a) => normalizeName(a.alias) === n);
  return alias ? alias.globalProductId : null;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/nomenclature-match.test.ts`
Expected: PASS — 5 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/nomenclature-match.ts artifacts/api-server/src/lib/nomenclature-match.test.ts
git commit -m "feat(supply): чистое сопоставление названия с каталогом (S0)"
```

---

## Task 3: Базовый шаблон номенклатуры (сид) (S0)

**Files:**
- Create: `artifacts/api-server/drizzle/migrations/0051_nomenclature_base_seed.sql`
- Modify: `artifacts/api-server/src/lib/migrate.ts`

**Примечание:** сид — платформенный (без company scope), idempotent через `WHERE NOT EXISTS` по `slug`. Набор базовый и расширяемый; заказчик дополняет позже.

- [ ] **Step 1: Написать сид-миграцию**

Создать `artifacts/api-server/drizzle/migrations/0051_nomenclature_base_seed.sql`:

```sql
-- Migration: базовый шаблон номенклатуры (S0). Idempotent по slug.
-- Категории верхнего уровня + стартовый набор товаров. Расширяется вручную.

-- Категории (parent_id = NULL — верхний уровень)
INSERT INTO global_product_categories (slug, name_ru, sort_order)
SELECT v.slug, v.name_ru, v.sort_order
FROM (VALUES
  ('concrete-mortar', 'Бетон и растворы', 10),
  ('metal-rolled',    'Металлопрокат',    20),
  ('brick-block',     'Кирпич и блоки',   30),
  ('bulk',            'Сыпучие',          40),
  ('fasteners',       'Крепёж',           50),
  ('electrical',      'Электрика',        60),
  ('plumbing',        'Сантехника',       70)
) AS v(slug, name_ru, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM global_product_categories c WHERE c.slug = v.slug
);

-- Товары. category_id резолвится по slug категории.
INSERT INTO global_products (category_id, canonical_name, slug, unit_default, status)
SELECT c.id, v.canonical_name, v.slug, v.unit_default, 'active'
FROM (VALUES
  ('concrete-mortar', 'Бетон М300',        'concrete-m300',   'м3'),
  ('concrete-mortar', 'Раствор цементный', 'mortar-cement',   'м3'),
  ('metal-rolled',    'Арматура А500 12мм','rebar-a500-12',   'т'),
  ('metal-rolled',    'Уголок 50x50',      'angle-50x50',     'м'),
  ('brick-block',     'Кирпич рядовой',    'brick-ordinary',  'шт'),
  ('brick-block',     'Газоблок D500',     'gasblock-d500',   'м3'),
  ('bulk',            'Цемент М500',       'cement-m500',     'т'),
  ('bulk',            'Песок речной',      'pesok-rechnoy',   'м3'),
  ('bulk',            'Щебень 5-20',       'gravel-5-20',     'м3'),
  ('fasteners',       'Саморез 3.5x35',    'screw-35x35',     'шт'),
  ('electrical',      'Кабель ВВГ 3x2.5',  'cable-vvg-3x2.5', 'м'),
  ('plumbing',        'Труба PPR 20',      'pipe-ppr-20',     'м')
) AS v(cat_slug, canonical_name, slug, unit_default)
JOIN global_product_categories c ON c.slug = v.cat_slug
WHERE NOT EXISTS (
  SELECT 1 FROM global_products p WHERE p.slug = v.slug
);
```

- [ ] **Step 2: Зарегистрировать миграцию в self-heal**

В `artifacts/api-server/src/lib/migrate.ts` в массиве `selfHeal` добавить в конец (после `"0050_construction_material_global_link.sql"`):

```ts
"0051_nomenclature_base_seed.sql",
```

- [ ] **Step 3: Применить сид на локальном Postgres и проверить**

Run:
```bash
cd artifacts/api-server && psql "$DATABASE_URL" -f drizzle/migrations/0051_nomenclature_base_seed.sql \
  && psql "$DATABASE_URL" -c "SELECT count(*) FROM global_product_categories WHERE slug IN ('concrete-mortar','bulk');" \
  && psql "$DATABASE_URL" -c "SELECT count(*) FROM global_products WHERE slug='cement-m500';"
```
Expected: категорий — 2, товаров с slug `cement-m500` — 1.

- [ ] **Step 4: Проверить идемпотентность (повторный прогон не плодит дубли)**

Run:
```bash
cd artifacts/api-server && psql "$DATABASE_URL" -f drizzle/migrations/0051_nomenclature_base_seed.sql \
  && psql "$DATABASE_URL" -c "SELECT count(*) FROM global_products WHERE slug='cement-m500';"
```
Expected: по-прежнему 1 (дубля нет).

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/drizzle/migrations/0051_nomenclature_base_seed.sql artifacts/api-server/src/lib/migrate.ts
git commit -m "feat(supply): базовый шаблон номенклатуры (S0 seed)"
```

---

## Task 4: Чистая агрегация остатков по объекту (S1)

**Files:**
- Create: `artifacts/api-server/src/lib/object-stock.ts`
- Test: `artifacts/api-server/src/lib/object-stock.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `artifacts/api-server/src/lib/object-stock.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateObjectStock,
  type WarehouseRow,
  type StockRow,
} from "./object-stock";

const warehouses: WarehouseRow[] = [
  { id: 1, type: "project", projectId: 10 },
  { id: 2, type: "foreman", projectId: 10 },
  { id: 3, type: "project", projectId: 20 }, // другой объект
  { id: 4, type: "central", projectId: null }, // не входит в объектный остаток
];
const stock: StockRow[] = [
  { warehouseId: 1, itemId: 100, quantity: "5", reservedQuantity: "1" },
  { warehouseId: 2, itemId: 100, quantity: "3", reservedQuantity: "0" }, // тот же объект+товар
  { warehouseId: 3, itemId: 100, quantity: "9", reservedQuantity: "0" }, // другой объект
  { warehouseId: 4, itemId: 100, quantity: "50", reservedQuantity: "0" }, // central
  { warehouseId: 1, itemId: 200, quantity: "2", reservedQuantity: "3" }, // reserved > qty
];

test("суммирует project+foreman склады одного объекта", () => {
  const lines = aggregateObjectStock(10, warehouses, stock);
  const item100 = lines.find((l) => l.itemId === 100);
  assert.deepEqual(item100, { itemId: 100, quantity: 8, reserved: 1, available: 7 });
});

test("исключает central и другие объекты", () => {
  const lines = aggregateObjectStock(10, warehouses, stock);
  // товар 100 только из складов 1+2 (8), без 3 (9) и 4 (50)
  assert.equal(lines.find((l) => l.itemId === 100)?.quantity, 8);
});

test("available не уходит в минус", () => {
  const lines = aggregateObjectStock(10, warehouses, stock);
  const item200 = lines.find((l) => l.itemId === 200);
  assert.deepEqual(item200, { itemId: 200, quantity: 2, reserved: 3, available: 0 });
});

test("объект без складов → пустой массив", () => {
  assert.deepEqual(aggregateObjectStock(999, warehouses, stock), []);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd artifacts/api-server && npx tsx --test src/lib/object-stock.test.ts`
Expected: FAIL — модуль `./object-stock` не найден.

- [ ] **Step 3: Реализовать модуль**

Создать `artifacts/api-server/src/lib/object-stock.ts`:

```ts
/**
 * Чистая агрегация остатков по объекту строительства (S1).
 * Объект = проект; его остаток складывается из складов типа project|foreman
 * с тем же projectId. Central/transit в объектный остаток не входят.
 */

export type WarehouseType = "central" | "project" | "foreman" | "transit";

export interface WarehouseRow {
  id: number;
  type: WarehouseType;
  projectId: number | null;
}

export interface StockRow {
  warehouseId: number;
  itemId: number;
  quantity: string;
  reservedQuantity: string;
}

export interface ObjectStockLine {
  itemId: number;
  quantity: number;
  reserved: number;
  available: number;
}

/** Суммарные остатки товаров на объекте (проекте), отсортированные по itemId. */
export function aggregateObjectStock(
  projectId: number,
  warehouses: WarehouseRow[],
  stock: StockRow[],
): ObjectStockLine[] {
  const objectWarehouseIds = new Set(
    warehouses
      .filter(
        (w) => (w.type === "project" || w.type === "foreman") && w.projectId === projectId,
      )
      .map((w) => w.id),
  );
  const byItem = new Map<number, ObjectStockLine>();
  for (const s of stock) {
    if (!objectWarehouseIds.has(s.warehouseId)) continue;
    const line =
      byItem.get(s.itemId) ?? { itemId: s.itemId, quantity: 0, reserved: 0, available: 0 };
    line.quantity += Number(s.quantity);
    line.reserved += Number(s.reservedQuantity);
    line.available = Math.max(0, line.quantity - line.reserved);
    byItem.set(s.itemId, line);
  }
  return [...byItem.values()].sort((a, b) => a.itemId - b.itemId);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd artifacts/api-server && npx tsx --test src/lib/object-stock.test.ts`
Expected: PASS — 4 теста зелёные.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/object-stock.ts artifacts/api-server/src/lib/object-stock.test.ts
git commit -m "feat(supply): чистая агрегация остатков по объекту (S1)"
```

---

## Task 5: Эндпоинт агрегированных остатков объекта (S1)

**Files:**
- Modify: `artifacts/api-server/src/routes/warehouse.ts`

**Контекст:** файл уже импортирует `warehouseStockTable`, `warehouseItemsTable`, `db`, `and`, `eq`, `AuthenticatedRequest`. Нужно добавить импорты `warehousesTable` и `inArray`, и новую пуре-либу.

- [ ] **Step 1: Добавить импорты**

В шапке `artifacts/api-server/src/routes/warehouse.ts`:
- В импорте из `drizzle-orm` добавить `inArray` (если ещё не импортирован).
- В импорте таблиц из `../lib/db` добавить `warehousesTable` (если ещё не импортирован).
- Добавить строку импорта пуре-либы:

```ts
import { aggregateObjectStock } from "../lib/object-stock";
```

- [ ] **Step 2: Добавить эндпоинт**

В `artifacts/api-server/src/routes/warehouse.ts` сразу после обработчика `router.get("/warehouse/stock", ...)` (заканчивается на строке с `});` около строки 350) добавить:

```ts
// GET /warehouse/objects/:projectId/stock — агрегированные остатки по объекту (S1)
router.get(
  "/warehouse/objects/:projectId/stock",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.scopedCompanyId!;
      const projectId = Number(req.params.projectId);

      const warehouses = await db
        .select({
          id: warehousesTable.id,
          type: warehousesTable.type,
          projectId: warehousesTable.projectId,
        })
        .from(warehousesTable)
        .where(eq(warehousesTable.companyId, companyId));

      const objectWarehouseIds = warehouses
        .filter(
          (w) => (w.type === "project" || w.type === "foreman") && w.projectId === projectId,
        )
        .map((w) => w.id);

      if (objectWarehouseIds.length === 0) {
        res.json([]);
        return;
      }

      const stock = await db
        .select({
          warehouseId: warehouseStockTable.warehouseId,
          itemId: warehouseStockTable.itemId,
          quantity: warehouseStockTable.quantity,
          reservedQuantity: warehouseStockTable.reservedQuantity,
          itemName: warehouseItemsTable.name,
          unit: warehouseItemsTable.unit,
        })
        .from(warehouseStockTable)
        .leftJoin(warehouseItemsTable, eq(warehouseItemsTable.id, warehouseStockTable.itemId))
        .where(
          and(
            eq(warehouseStockTable.companyId, companyId),
            inArray(warehouseStockTable.warehouseId, objectWarehouseIds),
          ),
        );

      const lines = aggregateObjectStock(
        projectId,
        warehouses.map((w) => ({ id: w.id, type: w.type as never, projectId: w.projectId })),
        stock.map((s) => ({
          warehouseId: s.warehouseId,
          itemId: s.itemId,
          quantity: s.quantity,
          reservedQuantity: s.reservedQuantity,
        })),
      );

      const meta = new Map(stock.map((s) => [s.itemId, { itemName: s.itemName, unit: s.unit }]));
      const enriched = lines.map((l) => ({
        ...l,
        itemName: meta.get(l.itemId)?.itemName ?? null,
        unit: meta.get(l.itemId)?.unit ?? null,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching object stock:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);
```

- [ ] **Step 3: Проверить типы**

Run: `cd artifacts/api-server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Запустить весь набор тестов снабжения/склада (регрессия)**

Run: `cd artifacts/api-server && npm test`
Expected: PASS — существующие тесты зелёные, новые (`nomenclature-match`, `object-stock`) зелёные.

- [ ] **Step 5: Проверить эндпоинт на локальном Postgres**

Поднять сервер локально и дёрнуть эндпоинт для проекта, у которого есть project/foreman склад с остатком:

Run: `curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/warehouse/objects/<projectId>/stock" | head`
Expected: JSON-массив строк вида `{ itemId, quantity, reserved, available, itemName, unit }`; для проекта без объектных складов — `[]`.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/warehouse.ts
git commit -m "feat(supply): эндпоинт агрегированных остатков объекта (S1)"
```

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** S0 = Task 1 (связка материалов) + Task 2 (сопоставление) + Task 3 (шаблон-сид); S1 = Task 4 (агрегация) + Task 5 (эндпоинт). Оба пункта декомпозиции покрыты.
- **Плейсхолдеры:** отсутствуют — все шаги содержат конкретный код/команды.
- **Согласованность типов:** `GlobalProductRef`/`AliasRef` (Task 2), `WarehouseRow`/`StockRow`/`ObjectStockLine` (Task 4) используются в Task 5 без расхождений имён.
- **Вне объёма (следующие циклы):** `getOrCreateObjectWarehouse` (нужен для приёмки — S6), UI остатков объекта в PWA (S8), проставление `global_product_id` в существующих материалах через сопоставление (миграция данных — отдельно, после наполнения каталога).
