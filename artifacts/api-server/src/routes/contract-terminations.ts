import { Router } from "express";
import { eq, and, gt, inArray, asc, desc, SQL } from "drizzle-orm";
import {
  db,
  contractTerminationsTable,
  constructionSalesContractsTable,
  constructionUnitsTable,
  leaseContractsTable,
  propertiesTable,
  constructionTasksTable,
  accrualsTable,
  paymentsTable,
  paymentAllocationsTable,
  depositsTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

const today = (): string => new Date().toISOString().split("T")[0];

/**
 * Зачесть депозит в счёт оплаты аренды: создать платёж-переклассификацию
 * (source_deposit_id) и распределить его по открытым начислениям договора,
 * начиная с самого раннего (или с указанного startAccrualId).
 * Возвращает id платежа и сколько удалось распределить.
 */
async function applyDepositToAccruals(params: {
  companyId: number;
  leaseContractId: number;
  deposit: typeof depositsTable.$inferSelect;
  amount: number;
  startAccrualId?: number | null;
  payDate: string;
}): Promise<{ paymentId: number; applied: number }> {
  const { companyId, leaseContractId, deposit, amount, startAccrualId, payDate } = params;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      companyId,
      leaseContractId,
      amount: String(amount),
      currency: deposit.currency,
      accountAmount: String(amount),
      exchangeRate: "1",
      exchangeRateDate: payDate,
      paymentDate: payDate,
      paymentMethod: "deposit_offset",
      accountId: deposit.accountId ?? null,
      sourceDepositId: deposit.id,
      note: `Зачёт депозита №${deposit.id} при расторжении`,
    })
    .returning();

  const accruals = await db
    .select()
    .from(accrualsTable)
    .where(
      and(
        eq(accrualsTable.companyId, companyId),
        eq(accrualsTable.leaseContractId, leaseContractId),
      ),
    )
    .orderBy(asc(accrualsTable.dueDate), asc(accrualsTable.id));

  let startIdx = 0;
  if (startAccrualId != null) {
    const idx = accruals.findIndex((a) => a.id === startAccrualId);
    if (idx >= 0) startIdx = idx;
  }

  let remaining = amount;
  for (let i = startIdx; i < accruals.length && remaining > 0.01; i++) {
    const acc = accruals[i];
    if (acc.status === "cancelled" || acc.status === "paid") continue;
    const total = parseFloat(acc.amount || "0");
    const paid = parseFloat(acc.paidAmount || "0");
    const open = Math.max(0, total - paid);
    if (open <= 0.01) continue;

    const allocAmount = Math.min(remaining, open);
    await db.insert(paymentAllocationsTable).values({
      companyId,
      paymentId: payment.id,
      accrualId: acc.id,
      amount: String(allocAmount),
      note: "Зачёт депозита",
    });

    const newPaid = paid + allocAmount;
    const newBalance = Math.max(0, total - newPaid);
    await db
      .update(accrualsTable)
      .set({
        paidAmount: String(newPaid),
        balance: String(newBalance),
        status: newBalance <= 0.01 ? "paid" : "partial",
      })
      .where(eq(accrualsTable.id, acc.id));

    remaining -= allocAmount;
  }

  return { paymentId: payment.id, applied: amount - Math.max(0, remaining) };
}

// ─── POST /contract-terminations ────────────────────────────────────────────
// Initiate a termination process for a sales or lease contract.
router.post(
  "/contract-terminations",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const { contractType, contractId, reason, basis, terminationDate } = req.body as {
      contractType?: string;
      contractId?: number;
      reason?: string;
      basis?: string;
      terminationDate?: string;
    };

    if (!contractType || !contractId) {
      res.status(400).json({ error: "contractType and contractId are required" });
      return;
    }
    if (contractType !== "sales" && contractType !== "lease") {
      res.status(400).json({ error: "contractType must be 'sales' or 'lease'" });
      return;
    }

    // Verify the contract belongs to this company
    if (contractType === "sales") {
      const [contract] = await db
        .select()
        .from(constructionSalesContractsTable)
        .where(
          and(
            eq(constructionSalesContractsTable.id, contractId),
            eq(constructionSalesContractsTable.companyId, companyId),
          ),
        );
      if (!contract) {
        res.status(404).json({ error: "Договор продажи не найден" });
        return;
      }
      if (contract.status === "terminated" || contract.status === "cancelled") {
        res.status(400).json({ error: "Договор уже расторгнут или отменён" });
        return;
      }
    } else {
      const [contract] = await db
        .select()
        .from(leaseContractsTable)
        .where(
          and(
            eq(leaseContractsTable.id, contractId),
            eq(leaseContractsTable.companyId, companyId),
          ),
        );
      if (!contract) {
        res.status(404).json({ error: "Договор аренды не найден" });
        return;
      }
      if (contract.status === "terminated") {
        res.status(400).json({ error: "Договор уже расторгнут" });
        return;
      }
    }

    const [row] = await db
      .insert(contractTerminationsTable)
      .values({
        companyId,
        contractType,
        contractId,
        terminationDate: terminationDate || today(),
        reason: reason ?? null,
        basis: basis ?? null,
        status: "initiated",
        financials: {},
        createdBy: req.userId ?? null,
      })
      .returning();

    res.status(201).json(row);
  },
);

// ─── GET /contract-terminations ─────────────────────────────────────────────
// List / filter terminations for this company.
router.get(
  "/contract-terminations",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const { contractType, contractId } = req.query as Record<string, string | undefined>;

    const conditions: SQL[] = [eq(contractTerminationsTable.companyId, companyId)];
    if (contractType) conditions.push(eq(contractTerminationsTable.contractType, contractType));
    if (contractId) {
      const parsed = parseInt(contractId, 10);
      if (!Number.isNaN(parsed)) conditions.push(eq(contractTerminationsTable.contractId, parsed));
    }

    const rows = await db
      .select()
      .from(contractTerminationsTable)
      .where(and(...conditions))
      .orderBy(contractTerminationsTable.createdAt);

    res.json(rows);
  },
);

// ─── PATCH /contract-terminations/:id/approve ───────────────────────────────
// Approve an initiated termination (initiated → approved).
router.patch(
  "/contract-terminations/:id/approve",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = parseInt(req.params.id as string, 10);

    const [term] = await db
      .select()
      .from(contractTerminationsTable)
      .where(
        and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)),
      );

    if (!term) {
      res.status(404).json({ error: "Расторжение не найдено" });
      return;
    }
    if (term.status !== "initiated") {
      res.status(400).json({
        error: `Неверный переход статуса: ожидается 'initiated', получен '${term.status}'`,
      });
      return;
    }

    const [row] = await db
      .update(contractTerminationsTable)
      .set({
        status: "approved",
        approvedBy: req.userId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)))
      .returning();

    res.json(row);
  },
);

// ─── POST /contract-terminations/:id/settle ─────────────────────────────────
// Record financial settlement (approved → settled).
router.post(
  "/contract-terminations/:id/settle",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = parseInt(req.params.id as string, 10);

    const [term] = await db
      .select()
      .from(contractTerminationsTable)
      .where(
        and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)),
      );

    if (!term) {
      res.status(404).json({ error: "Расторжение не найдено" });
      return;
    }
    if (term.status !== "approved") {
      res.status(400).json({
        error: `Неверный переход статуса: ожидается 'approved', получен '${term.status}'`,
      });
      return;
    }

    const { paid, debt, penalty, depositReturn, refund, note, depositActions } = req.body as {
      paid?: number;
      debt?: number;
      penalty?: number;
      depositReturn?: number;
      refund?: number;
      note?: string;
      depositActions?: {
        apply?: { amount?: number; startAccrualId?: number | null };
        return?: { amount?: number; date?: string };
      };
    };

    // ── Реальная обработка депозита (только аренда) ─────────────────────────
    let depositApplied = 0;
    let depositReturned = 0;
    if (depositActions && term.contractType === "lease") {
      const applyAmount = Math.max(0, Number(depositActions.apply?.amount ?? 0));
      const returnAmount = Math.max(0, Number(depositActions.return?.amount ?? 0));

      if (applyAmount > 0 || returnAmount > 0) {
        const [deposit] = await db
          .select()
          .from(depositsTable)
          .where(
            and(
              eq(depositsTable.companyId, companyId),
              eq(depositsTable.leaseContractId, term.contractId),
              eq(depositsTable.status, "held"),
            ),
          )
          .orderBy(desc(depositsTable.id))
          .limit(1);

        if (!deposit) {
          res.status(400).json({ error: "Активный депозит по договору не найден" });
          return;
        }

        const depositTotal = parseFloat(deposit.amount || "0");
        if (applyAmount + returnAmount > depositTotal + 0.01) {
          res.status(400).json({
            error: `Сумма зачёта и возврата (${applyAmount + returnAmount}) превышает депозит (${depositTotal})`,
          });
          return;
        }

        const payDate = term.terminationDate || today();

        if (applyAmount > 0) {
          const r = await applyDepositToAccruals({
            companyId,
            leaseContractId: term.contractId,
            deposit,
            amount: applyAmount,
            startAccrualId: depositActions.apply?.startAccrualId ?? null,
            payDate,
          });
          depositApplied = r.applied;
        }

        depositReturned = returnAmount;

        await db
          .update(depositsTable)
          .set({
            status: applyAmount > 0 ? "applied" : returnAmount > 0 ? "returned" : deposit.status,
            returnedAmount: returnAmount > 0 ? String(returnAmount) : deposit.returnedAmount,
            returnedDate: returnAmount > 0 ? depositActions.return?.date || payDate : deposit.returnedDate,
            note: [
              deposit.note,
              `Расторжение: зачтено ${depositApplied}, возвращено ${returnAmount}`,
            ]
              .filter(Boolean)
              .join(" · "),
          })
          .where(eq(depositsTable.id, deposit.id));
      }
    }

    const financials = {
      ...(term.financials as Record<string, unknown>),
      ...(paid !== undefined ? { paid } : {}),
      ...(debt !== undefined ? { debt } : {}),
      ...(penalty !== undefined ? { penalty } : {}),
      ...(depositReturn !== undefined ? { depositReturn } : {}),
      ...(refund !== undefined ? { refund } : {}),
      ...(depositApplied > 0 ? { depositApplied } : {}),
      ...(depositReturned > 0 ? { depositReturn: depositReturned } : {}),
    };

    const [row] = await db
      .update(contractTerminationsTable)
      .set({
        status: "settled",
        financials,
        note: note !== undefined ? note : term.note,
        updatedAt: new Date(),
      })
      .where(and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)))
      .returning();

    res.json(row);
  },
);

// ─── POST /contract-terminations/:id/close ──────────────────────────────────
// Close the termination (settled → closed), set contract terminated, return object to pool.
router.post(
  "/contract-terminations/:id/close",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const id = parseInt(req.params.id as string, 10);

    const [term] = await db
      .select()
      .from(contractTerminationsTable)
      .where(
        and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)),
      );

    if (!term) {
      res.status(404).json({ error: "Расторжение не найдено" });
      return;
    }
    if (term.status !== "settled") {
      res.status(400).json({
        error: `Неверный переход статуса: ожидается 'settled', получен '${term.status}'`,
      });
      return;
    }

    // Close the termination record
    const [closedTerm] = await db
      .update(contractTerminationsTable)
      .set({ status: "closed", updatedAt: new Date() })
      .where(and(eq(contractTerminationsTable.id, id), eq(contractTerminationsTable.companyId, companyId)))
      .returning();

    let unitReturned: { id: number; unitNumber: string } | null = null;
    let propertyReturned: { id: number } | null = null;

    if (term.contractType === "sales") {
      // Mark the sales contract as terminated
      await db
        .update(constructionSalesContractsTable)
        .set({ status: "terminated" })
        .where(
          and(
            eq(constructionSalesContractsTable.id, term.contractId),
            eq(constructionSalesContractsTable.companyId, companyId),
          ),
        );

      // Return linked unit to available pool
      const [contract] = await db
        .select()
        .from(constructionSalesContractsTable)
        .where(eq(constructionSalesContractsTable.id, term.contractId));

      if (contract?.unitId) {
        const [unit] = await db
          .update(constructionUnitsTable)
          .set({
            status: "available",
            salesContractId: null,
            buyerId: null,
            clientId: null,
            salePrice: null,
            saleDate: null,
          })
          .where(
            and(
              eq(constructionUnitsTable.id, contract.unitId),
              eq(constructionUnitsTable.companyId, companyId),
            ),
          )
          .returning({ id: constructionUnitsTable.id, unitNumber: constructionUnitsTable.unitNumber });
        if (unit) unitReturned = unit;
      }

      // Best-effort: cancel open tasks tied to this sales contract
      try {
        await db
          .update(constructionTasksTable)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(constructionTasksTable.salesContractId, term.contractId),
              eq(constructionTasksTable.companyId, companyId),
            ),
          );
      } catch {
        // Task-closing is best-effort; skip if relation does not exist
      }
    } else {
      const termDate = term.terminationDate || today();

      // Mark the lease contract as terminated and fix its end date so no further
      // accruals are generated past the termination date.
      await db
        .update(leaseContractsTable)
        .set({ status: "terminated", endDate: termDate })
        .where(
          and(
            eq(leaseContractsTable.id, term.contractId),
            eq(leaseContractsTable.companyId, companyId),
          ),
        );

      // Cancel future unpaid accruals (dueDate after termination, nothing paid yet).
      const futureAccruals = await db
        .select()
        .from(accrualsTable)
        .where(
          and(
            eq(accrualsTable.leaseContractId, term.contractId),
            eq(accrualsTable.companyId, companyId),
            inArray(accrualsTable.status, ["pending", "overdue", "approved"]),
            gt(accrualsTable.dueDate, termDate),
          ),
        );
      for (const a of futureAccruals) {
        if (parseFloat(a.paidAmount || "0") > 0) continue;
        await db
          .update(accrualsTable)
          .set({
            status: "cancelled",
            balance: "0",
            notes: [a.notes, `Отменено при расторжении ${termDate}`].filter(Boolean).join(" · "),
          })
          .where(eq(accrualsTable.id, a.id));
      }

      // Return linked property to free pool
      const [contract] = await db
        .select()
        .from(leaseContractsTable)
        .where(eq(leaseContractsTable.id, term.contractId));

      if (contract?.propertyId) {
        const [prop] = await db
          .update(propertiesTable)
          .set({ rentalStatus: "free" })
          .where(
            and(
              eq(propertiesTable.id, contract.propertyId),
              eq(propertiesTable.companyId, companyId),
            ),
          )
          .returning({ id: propertiesTable.id });
        if (prop) propertyReturned = prop;
      }
    }

    res.json({
      termination: closedTerm,
      unitReturned,
      propertyReturned,
    });
  },
);

export default router;
