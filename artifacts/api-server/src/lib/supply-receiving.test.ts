import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReceipt, computeWriteoffAmount } from "./supply-receiving";

test("приёмка на пустой остаток берёт цену поставки", () => {
  assert.deepEqual(applyReceipt(0, 0, 10, 50), { quantity: 10, avgPrice: 50 });
});

test("приёмка считает средневзвешенную цену", () => {
  // было 10 по 50 (=500), пришло 10 по 70 (=700) → 20 по 60
  assert.deepEqual(applyReceipt(10, 50, 10, 70), { quantity: 20, avgPrice: 60 });
});

test("нулевая приёмка не меняет цену", () => {
  assert.deepEqual(applyReceipt(5, 40, 0, 999), { quantity: 5, avgPrice: 40 });
});

test("итоговое нулевое количество → нулевая цена", () => {
  assert.deepEqual(applyReceipt(0, 0, 0, 0), { quantity: 0, avgPrice: 0 });
});

test("сумма списания = количество × средняя цена", () => {
  assert.equal(computeWriteoffAmount(4, 25), 100);
});

test("отрицательные значения списания трактуются как 0", () => {
  assert.equal(computeWriteoffAmount(-3, 25), 0);
  assert.equal(computeWriteoffAmount(3, -25), 0);
});
