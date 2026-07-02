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
