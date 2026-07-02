import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextPaymentStatus,
  resolveRequiredApprover,
  type PaymentStatus,
  type ApprovalLimit,
} from "./supply-payments";

test("nextPaymentStatus: submit переводит none → pending_finance", () => {
  assert.equal(nextPaymentStatus("none", { type: "submit" }), "pending_finance");
});

test("nextPaymentStatus: approve переводит pending_finance → approved_by_finance", () => {
  assert.equal(nextPaymentStatus("pending_finance", { type: "approve" }), "approved_by_finance");
});

test("nextPaymentStatus: reject из pending_finance → payment_rejected", () => {
  assert.equal(nextPaymentStatus("pending_finance", { type: "reject" }), "payment_rejected");
});

test("nextPaymentStatus: send из approved_by_finance → sent_to_payment", () => {
  assert.equal(nextPaymentStatus("approved_by_finance", { type: "send" }), "sent_to_payment");
});

test("nextPaymentStatus: частичная оплата → paid_partially", () => {
  assert.equal(nextPaymentStatus("sent_to_payment", { type: "pay", paidAmount: 400, totalAmount: 1000 }), "paid_partially");
});

test("nextPaymentStatus: полная оплата → paid", () => {
  assert.equal(nextPaymentStatus("sent_to_payment", { type: "pay", paidAmount: 1000, totalAmount: 1000 }), "paid");
});

test("nextPaymentStatus: дооплата из paid_partially до полной → paid", () => {
  assert.equal(nextPaymentStatus("paid_partially", { type: "pay", paidAmount: 1000, totalAmount: 1000 }), "paid");
});

test("nextPaymentStatus: недопустимый переход бросает ошибку", () => {
  assert.throws(() => nextPaymentStatus("paid" as PaymentStatus, { type: "approve" }));
});

const LIMITS: ApprovalLimit[] = [
  { role: "pto", maxAmount: "50000" },
  { role: "finance_director", maxAmount: "500000" },
  { role: "ceo", maxAmount: "999999999" },
];

test("resolveRequiredApprover: малая сумма — минимальный уровень (pto)", () => {
  assert.equal(resolveRequiredApprover("40000", LIMITS), "pto");
});

test("resolveRequiredApprover: средняя сумма — finance_director", () => {
  assert.equal(resolveRequiredApprover("120000", LIMITS), "finance_director");
});

test("resolveRequiredApprover: сумма выше всех порогов — высший уровень (ceo)", () => {
  assert.equal(resolveRequiredApprover("5000000000", LIMITS), "ceo");
});

test("resolveRequiredApprover: без лимитов — null", () => {
  assert.equal(resolveRequiredApprover("100", []), null);
});

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
