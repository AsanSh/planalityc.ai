import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, documentsTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { createTaxInvoiceDocument } from "../lib/document-generators";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

router.get("/documents", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string | undefined>;
  const conditions: SQL[] = [];
  conditions.push(eq(documentsTable.companyId, req.scopedCompanyId!));
  if (entityType) conditions.push(eq(documentsTable.entityType, entityType));
  if (entityId) conditions.push(eq(documentsTable.entityId, parseInt(entityId, 10)));
  const rows = await db.select().from(documentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(documentsTable.createdAt);
  res.json(rows);
});

router.post("/documents", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { entityType, entityId, name, fileUrl, fileSize, mimeType } = req.body;
  if (!entityType || !entityId || !name || !fileUrl) {
    res.status(400).json({ error: "entityType, entityId, name, fileUrl required" });
    return;
  }
  const [row] = await db.insert(documentsTable).values({
    companyId: req.scopedCompanyId!, entityType, entityId, name, fileUrl, fileSize, mimeType
  }).returning();
  res.status(201).json(row);
});

/**
 * POST /documents/tax-invoice
 * Generate a tax invoice (счёт-фактура с НДС) for a contract + optional payment.
 *
 * Body:
 *   contractType    "lease" | "construction_sales"   (required)
 *   contractId      number                            (required)
 *   paymentId?      number
 *   grossAmount     number   — сумма с НДС (gross)   (required)
 *   currency?       string   default "KGS"
 *   vatRate?        number   default 12 (%)
 *   buyerName?      string
 *   sellerName?     string
 *   contractNumber? string
 *   serviceDescription? string
 */
router.post("/documents/tax-invoice", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const {
    contractType,
    contractId,
    paymentId,
    grossAmount,
    currency = "KGS",
    vatRate,
    buyerName,
    sellerName,
    contractNumber,
    serviceDescription,
  } = req.body as {
    contractType?: string;
    contractId?: unknown;
    paymentId?: unknown;
    grossAmount?: unknown;
    currency?: string;
    vatRate?: unknown;
    buyerName?: string;
    sellerName?: string;
    contractNumber?: string;
    serviceDescription?: string;
  };

  if (!contractType || !contractId || !grossAmount) {
    res.status(400).json({ error: "contractType, contractId, grossAmount required" });
    return;
  }

  const gross = parseFloat(String(grossAmount));
  if (!Number.isFinite(gross) || gross <= 0) {
    res.status(400).json({ error: "grossAmount must be a positive number" });
    return;
  }

  try {
    const result = await createTaxInvoiceDocument({
      companyId,
      contractType: String(contractType),
      contractId: Number(contractId),
      paymentId: paymentId ? Number(paymentId) : null,
      contractNumber: contractNumber ?? null,
      buyerName: buyerName ?? null,
      sellerName: sellerName ?? null,
      grossAmount: gross,
      currency: String(currency),
      vatRate: vatRate !== undefined ? Number(vatRate) : undefined,
      serviceDescription: serviceDescription ?? undefined,
    });

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка создания счёт-фактуры";
    res.status(500).json({ error: message });
  }
});

router.delete("/documents/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const conditions: SQL[] = [eq(documentsTable.id, id)];
  conditions.push(eq(documentsTable.companyId, req.scopedCompanyId!));
  await db.delete(documentsTable).where(and(...conditions));
  res.sendStatus(204);
});

export default router;
