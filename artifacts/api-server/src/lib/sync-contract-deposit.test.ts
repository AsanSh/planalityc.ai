import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { syncContractDeposit } from "./sync-contract-deposit";

type FakeRow = {
  id: number;
  status: string;
  note: string | null;
  returnedAmount: string | null;
  accountId: number | null;
};

function makeFakeDb(rows: FakeRow[]) {
  const calls = {
    updates: [] as Record<string, unknown>[],
    inserts: [] as Record<string, unknown>[],
    deletes: 0,
  };
  const db = {
    select: () => ({ from: () => ({ where: async () => rows }) }),
    update: () => ({
      set: (vals: Record<string, unknown>) => ({
        where: async () => {
          calls.updates.push(vals);
        },
      }),
    }),
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        calls.inserts.push(v);
      },
    }),
    delete: () => ({
      where: async () => {
        calls.deletes += 1;
      },
    }),
  };
  return { db, calls };
}

const baseParams = {
  companyId: 1,
  leaseContractId: 10,
  currency: "KGS",
  signDate: "2026-06-01",
  startDate: "2026-06-15",
};

describe("syncContractDeposit", () => {
  it("создаёт депозит из договора, если его ещё нет", async () => {
    const { db, calls } = makeFakeDb([]);
    await syncContractDeposit(
      { ...baseParams, depositAmount: 50000, depositAccountId: 7 },
      db,
    );
    assert.equal(calls.inserts.length, 1);
    const ins = calls.inserts[0];
    assert.equal(ins.amount, "50000");
    assert.equal(ins.status, "held");
    assert.equal(ins.note, "Из договора");
    assert.equal(ins.accountId, 7);
    assert.equal(ins.receivedDate, "2026-06-01"); // signDate приоритетнее startDate
    assert.equal(calls.updates.length, 0);
    assert.equal(calls.deletes, 0);
  });

  it("без signDate использует startDate", async () => {
    const { db, calls } = makeFakeDb([]);
    await syncContractDeposit(
      { ...baseParams, signDate: null, depositAmount: 100 },
      db,
    );
    assert.equal(calls.inserts[0].receivedDate, "2026-06-15");
  });

  it("обновляет существующий авто-депозит", async () => {
    const held: FakeRow = { id: 5, status: "held", note: "Из договора", returnedAmount: null, accountId: 3 };
    const { db, calls } = makeFakeDb([held]);
    await syncContractDeposit(
      { ...baseParams, depositAmount: "70000", currency: "USD", depositAccountId: 9 },
      db,
    );
    assert.equal(calls.inserts.length, 0);
    assert.equal(calls.updates.length, 1);
    assert.equal(calls.updates[0].amount, "70000");
    assert.equal(calls.updates[0].currency, "USD");
    assert.equal(calls.updates[0].accountId, 9);
  });

  it("без нового счёта сохраняет счёт существующего депозита", async () => {
    const held: FakeRow = { id: 5, status: "held", note: "Из договора", returnedAmount: null, accountId: 3 };
    const { db, calls } = makeFakeDb([held]);
    await syncContractDeposit({ ...baseParams, depositAmount: 100 }, db);
    assert.equal(calls.updates[0].accountId, 3);
  });

  it("обнуление суммы удаляет только авто-созданный депозит", async () => {
    const auto: FakeRow = { id: 5, status: "held", note: "Из договора", returnedAmount: null, accountId: null };
    const { db, calls } = makeFakeDb([auto]);
    await syncContractDeposit({ ...baseParams, depositAmount: 0 }, db);
    assert.equal(calls.deletes, 1);
    assert.equal(calls.inserts.length, 0);
  });

  it("обнуление суммы НЕ трогает ручной депозит и депозит с возвратом", async () => {
    const manual: FakeRow = { id: 6, status: "held", note: "Внесён вручную", returnedAmount: null, accountId: null };
    const partiallyReturned: FakeRow = { id: 7, status: "held", note: "Из договора", returnedAmount: "1000", accountId: null };
    const { db, calls } = makeFakeDb([manual, partiallyReturned]);
    await syncContractDeposit({ ...baseParams, depositAmount: null }, db);
    assert.equal(calls.deletes, 0);
  });

  it("некорректная сумма трактуется как отсутствие депозита", async () => {
    const { db, calls } = makeFakeDb([]);
    await syncContractDeposit({ ...baseParams, depositAmount: "abc" }, db);
    assert.equal(calls.inserts.length, 0);
    assert.equal(calls.updates.length, 0);
  });
});
