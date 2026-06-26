import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import {
  db,
  contractTerminationsTable,
  constructionSalesContractsTable,
  constructionUnitsTable,
  leaseContractsTable,
  propertiesTable,
  constructionTasksTable,
} from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ─── POST /contract-terminations ────────────────────────────────────────────
// Initiate a termination process for a sales or lease contract.
router.post(
  "/contract-terminations",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = req.scopedCompanyId!;
    const { contractType, contractId, reason, basis } = req.body as {
      contractType?: string;
      contractId?: number;
      reason?: string;
      basis?: string;
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

    const { paid, debt, penalty, depositReturn, refund, note } = req.body as {
      paid?: number;
      debt?: number;
      penalty?: number;
      depositReturn?: number;
      refund?: number;
      note?: string;
    };

    const financials = {
      ...(term.financials as Record<string, unknown>),
      ...(paid !== undefined ? { paid } : {}),
      ...(debt !== undefined ? { debt } : {}),
      ...(penalty !== undefined ? { penalty } : {}),
      ...(depositReturn !== undefined ? { depositReturn } : {}),
      ...(refund !== undefined ? { refund } : {}),
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
      // Mark the lease contract as terminated
      await db
        .update(leaseContractsTable)
        .set({ status: "terminated" })
        .where(
          and(
            eq(leaseContractsTable.id, term.contractId),
            eq(leaseContractsTable.companyId, companyId),
          ),
        );

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
