import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveWarehouseItemId,
  type ReqItemRef,
  type SupplierProductRef,
  type WarehouseItemRef,
} from "./supply-catalog";

const suppliers: SupplierProductRef[] = [
  { id: 100, globalProductId: 7 },
  { id: 101, globalProductId: null },
];
const warehouseItems: WarehouseItemRef[] = [
  { id: 1, globalProductId: 7 },
  { id: 2, globalProductId: 9 },
];

test("резолв по globalProductId напрямую", () => {
  const ref: ReqItemRef = { globalProductId: 7, supplierProductId: null };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), 1);
});

test("резолв по supplierProductId → globalProductId → warehouse item", () => {
  const ref: ReqItemRef = { globalProductId: null, supplierProductId: 100 };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), 1);
});

test("нет соответствия в номенклатуре склада — null", () => {
  const ref: ReqItemRef = { globalProductId: 999, supplierProductId: null };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), null);
});

test("supplierProduct без globalProductId — null", () => {
  const ref: ReqItemRef = { globalProductId: null, supplierProductId: 101 };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), null);
});

test("кастомная позиция без ссылок — null", () => {
  const ref: ReqItemRef = { globalProductId: null, supplierProductId: null };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), null);
});

test("globalProductId приоритетнее supplierProductId", () => {
  const ref: ReqItemRef = { globalProductId: 9, supplierProductId: 100 };
  assert.equal(resolveWarehouseItemId(ref, suppliers, warehouseItems), 2);
});
