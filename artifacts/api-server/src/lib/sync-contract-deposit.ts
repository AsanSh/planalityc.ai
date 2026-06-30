import { and, eq, isNull } from "drizzle-orm";
import { db, depositsTable } from "./db";

const CONTRACT_DEPOSIT_NOTE = "Из договора";

/** Синхронизирует запись в deposits с depositAmount договора (без счёта — до фактического поступления). */
export async function syncContractDeposit(params: {
  companyId: number;
  leaseContractId: number;
  depositAmount: number | string | null | undefined;
  currency: string;
  signDate: string | null | undefined;
  startDate: string;
}): Promise<void> {
  const amount = parseFloat(String(params.depositAmount ?? 0));
  const receivedDate = String(params.signDate || params.startDate).slice(0, 10);

  const contractDeposits = await db.select().from(depositsTable).where(
    and(
      eq(depositsTable.companyId, params.companyId),
      eq(depositsTable.leaseContractId, params.leaseContractId),
      isNull(depositsTable.accountId),
    ),
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    for (const d of contractDeposits) {
      if (d.status === "held" && !d.returnedAmount) {
        await db.delete(depositsTable).where(eq(depositsTable.id, d.id));
      }
    }
    return;
  }

  const held = contractDeposits.find((d) => d.status === "held");
  const amountStr = String(amount);

  if (held) {
    await db.update(depositsTable)
      .set({ amount: amountStr, currency: params.currency, receivedDate })
      .where(eq(depositsTable.id, held.id));
    return;
  }

  if (contractDeposits.length === 0) {
    await db.insert(depositsTable).values({
      companyId: params.companyId,
      leaseContractId: params.leaseContractId,
      amount: amountStr,
      currency: params.currency,
      status: "held",
      receivedDate,
      accountId: null,
      note: CONTRACT_DEPOSIT_NOTE,
    });
  }
}
