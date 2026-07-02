import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allocatePaymentAcrossAccruals } from "./payment-allocation";

type FakeAccrual = {
  id: number;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  paidAt: string | null;
};

function accrual(partial: Partial<FakeAccrual> & { id: number }): FakeAccrual {
  return {
    installmentNumber: partial.id,
    dueDate: `2026-0${partial.id}-01`,
    amount: "1000",
    paidAmount: "0",
    remainingAmount: "1000",
    status: "pending",
    paidAt: null,
    ...partial,
  } as FakeAccrual;
}

function makeFakeDb(rows: FakeAccrual[]) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: async () => rows }),
      }),
    }),
    update: () => ({
      set: (vals: Record<string, unknown>) => ({
        where: async () => {
          updates.push(vals);
        },
      }),
    }),
  };
  return { db, updates };
}

const base = { companyId: 1, contractId: 100, payDate: "2026-06-10" };

describe("allocatePaymentAcrossAccruals", () => {
  it("платёж закрывает первое начисление и частично второе", async () => {
    const { db, updates } = makeFakeDb([accrual({ id: 1 }), accrual({ id: 2 })]);
    const r = await allocatePaymentAcrossAccruals({ ...base, amount: 1500 }, db);

    assert.equal(r.allocations.length, 2);
    assert.deepEqual(
      r.allocations.map((a) => [a.accrualId, a.applied, a.status]),
      [[1, 1000, "paid"], [2, 500, "partial"]],
    );
    assert.equal(r.unallocated, 0);
    assert.equal(updates.length, 2);
    assert.equal(updates[0].paidAt, "2026-06-10"); // оплачено полностью → дата платежа
    assert.equal(updates[1].paidAt, null); // частично → дата не ставится
  });

  it("уже оплаченные начисления пропускаются", async () => {
    const paid = accrual({ id: 1, paidAmount: "1000", remainingAmount: "0", status: "paid" });
    const { db } = makeFakeDb([paid, accrual({ id: 2 })]);
    const r = await allocatePaymentAcrossAccruals({ ...base, amount: 400 }, db);

    assert.equal(r.allocations.length, 1);
    assert.equal(r.allocations[0].accrualId, 2);
    assert.equal(r.allocations[0].applied, 400);
    assert.equal(r.allocations[0].status, "partial");
  });

  it("startAccrualId сдвигает начало распределения", async () => {
    const { db } = makeFakeDb([accrual({ id: 1 }), accrual({ id: 2 }), accrual({ id: 3 })]);
    const r = await allocatePaymentAcrossAccruals(
      { ...base, amount: 1000, startAccrualId: 2 },
      db,
    );
    assert.equal(r.allocations.length, 1);
    assert.equal(r.allocations[0].accrualId, 2);
  });

  it("излишек платежа возвращается как unallocated", async () => {
    const { db } = makeFakeDb([accrual({ id: 1 })]);
    const r = await allocatePaymentAcrossAccruals({ ...base, amount: 1700 }, db);
    assert.equal(r.allocations.length, 1);
    assert.equal(r.unallocated, 700);
  });

  it("remainingAmount имеет приоритет над amount-paidAmount", async () => {
    // корректировка: remaining вручную уменьшен до 200
    const adjusted = accrual({ id: 1, amount: "1000", paidAmount: "0", remainingAmount: "200" });
    const { db } = makeFakeDb([adjusted]);
    const r = await allocatePaymentAcrossAccruals({ ...base, amount: 500 }, db);
    assert.equal(r.allocations[0].applied, 200);
    assert.equal(r.unallocated, 300);
  });

  it("пустой список начислений — весь платёж unallocated", async () => {
    const { db } = makeFakeDb([]);
    const r = await allocatePaymentAcrossAccruals({ ...base, amount: 999 }, db);
    assert.equal(r.allocations.length, 0);
    assert.equal(r.unallocated, 999);
  });
});
