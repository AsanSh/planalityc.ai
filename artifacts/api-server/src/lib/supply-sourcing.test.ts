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
    { productId: 3, quantity: 1, unitPrice: 0, lineTotal: 0 },
  ]);
  assert.equal(res.total, 450);
});

test("пустой список → total 0", () => {
  assert.deepEqual(priceOrderLines([], {}), { lines: [], total: 0 });
});
