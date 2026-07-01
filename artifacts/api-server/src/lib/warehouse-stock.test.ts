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

test("computeTransferReceipt: пустое quantityReceived трактуется как полное получение", () => {
  const lines: TransferLine[] = [{ itemId: 7, quantitySent: "50", quantityReceived: null }];
  const r = computeTransferReceipt(lines);
  assert.equal(r.status, "received");
  assert.equal(r.discrepancies.length, 0);
});
