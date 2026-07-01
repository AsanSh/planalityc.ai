import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitRequestItem,
  weightedAvgPrice,
  consumeBatchesFIFO,
  type Batch,
} from "./supply-batches";

test("splitRequestItem: остатка хватает — всё со склада", () => {
  assert.deepEqual(splitRequestItem(100, 40), { fromStock: 40, toPurchase: 0 });
});

test("splitRequestItem: остатка не хватает — часть со склада, часть докупить", () => {
  assert.deepEqual(splitRequestItem(30, 100), { fromStock: 30, toPurchase: 70 });
});

test("splitRequestItem: остатка нет — всё докупить", () => {
  assert.deepEqual(splitRequestItem(0, 50), { fromStock: 0, toPurchase: 50 });
});

test("splitRequestItem: отрицательный остаток трактуется как 0", () => {
  assert.deepEqual(splitRequestItem(-5, 50), { fromStock: 0, toPurchase: 50 });
});

const BATCHES: Batch[] = [
  { id: 1, quantity: "10", unitPrice: "400", receivedAt: "2026-01-01" },
  { id: 2, quantity: "30", unitPrice: "410", receivedAt: "2026-02-01" },
];

test("weightedAvgPrice: средневзвешенная по количеству", () => {
  // (10*400 + 30*410) / 40 = 16300/40 = 407.5
  assert.equal(weightedAvgPrice(BATCHES), 407.5);
});

test("weightedAvgPrice: пусто — 0", () => {
  assert.equal(weightedAvgPrice([]), 0);
});

test("consumeBatchesFIFO: списание в пределах первой партии", () => {
  const r = consumeBatchesFIFO(BATCHES, 5);
  assert.deepEqual(r.consumed, [{ batchId: 1, quantity: 5, unitPrice: 400 }]);
  assert.equal(r.cost, 2000);
  assert.equal(r.shortfall, 0);
});

test("consumeBatchesFIFO: списание через две партии", () => {
  const r = consumeBatchesFIFO(BATCHES, 25);
  // 10 из партии1 (400) + 15 из партии2 (410)
  assert.deepEqual(r.consumed, [
    { batchId: 1, quantity: 10, unitPrice: 400 },
    { batchId: 2, quantity: 15, unitPrice: 410 },
  ]);
  assert.equal(r.cost, 10 * 400 + 15 * 410);
  assert.equal(r.shortfall, 0);
});

test("consumeBatchesFIFO: не хватает партий — shortfall", () => {
  const r = consumeBatchesFIFO(BATCHES, 60);
  assert.equal(r.shortfall, 20); // 40 в партиях, просили 60
  assert.equal(r.cost, 10 * 400 + 30 * 410);
});
