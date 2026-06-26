import { Router } from "express";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import {
  db, usersTable, investorsTable, investmentsTable, distributionsTable,
  propertiesTable, tenantsTable, leaseContractsTable, paymentsTable, accrualsTable,
  constructionContractorsTable, constructionExpensesTable,
  warehouseSuppliersTable, warehouseIncomingTable, warehouseItemsTable,
  warehouseSupplierPaymentsTable,
  counterpartiesTable, constructionSalesContractsTable, constructionAccrualsTable,
  constructionOperationsTable, constructionUnitsTable, constructionProjectsTable,
  companiesTable, portalContentTable, portalAccessTable, portalPollVotesTable, portalContentReadsTable,
} from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import { hashPassword, validatePassword } from "../lib/security";
import { sendPortalAccessEmail } from "../lib/email";
import { createPortalUser, findUserByLinkedEntity } from "../lib/portal-account";
import { parseContractDocumentMeta, summarizeContractDocument } from "../lib/contract-document";
import { buildBuyerReconciliation, buildSupplierReconciliation } from "../lib/portal-reconciliation";
import { uploadFile, isBlobEnabled } from "../lib/file-storage";
import { notifyPortalPublish } from "../lib/portal-notify";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

const LINKED_KEY_BY_TYPE: Record<string, "linkedTenantId" | "linkedBuyerId" | "linkedContractorId" | "linkedSupplierId" | "linkedInvestorId"> = {
  tenant: "linkedTenantId",
  buyer: "linkedBuyerId",
  contractor: "linkedContractorId",
  supplier: "linkedSupplierId",
  investor: "linkedInvestorId",
};

// ── Загрузчики данных порталов (используются и для /me, и для /preview) ──────────

async function loadInvestorPortal(companyId: number, investorId: number) {
  const [investor] = await db.select().from(investorsTable)
    .where(and(
      eq(investorsTable.id, investorId),
      eq(investorsTable.companyId, companyId),
    ));
  if (!investor) return null;

  const investments = await db.select({
    id: investmentsTable.id,
    propertyId: investmentsTable.propertyId,
    sharePercent: investmentsTable.sharePercent,
    capitalInvested: investmentsTable.capitalInvested,
    currency: investmentsTable.currency,
    investedAt: investmentsTable.investedAt,
    createdAt: investmentsTable.createdAt,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
  })
    .from(investmentsTable)
    .leftJoin(propertiesTable, eq(investmentsTable.propertyId, propertiesTable.id))
    .where(eq(investmentsTable.investorId, investorId));

  const investedPropertyIds = investments
    .map(inv => inv.propertyId)
    .filter((id): id is number => id !== null);
  const distributions = investedPropertyIds.length > 0
    ? await db.select().from(distributionsTable)
        .where(inArray(distributionsTable.propertyId, investedPropertyIds))
    : [];

  return { investor, investments, distributions };
}

async function loadContractorPortal(companyId: number, contractorId: number) {
  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(
      eq(constructionContractorsTable.id, contractorId),
      eq(constructionContractorsTable.companyId, companyId),
    ));
  if (!contractor) return null;

  const payments = await db.select({
    id: constructionExpensesTable.id,
    date: constructionExpensesTable.date,
    description: constructionExpensesTable.description,
    amount: constructionExpensesTable.amount,
    currency: constructionExpensesTable.currency,
    status: constructionExpensesTable.status,
    projectId: constructionExpensesTable.projectId,
  })
    .from(constructionExpensesTable)
    .where(and(
      eq(constructionExpensesTable.contractorId, contractorId),
      eq(constructionExpensesTable.companyId, companyId),
    ))
    .orderBy(desc(constructionExpensesTable.date));

  const contractAmount = parseFloat(String(contractor.contractAmount ?? 0));
  const paidAmount = parseFloat(String(contractor.paidAmount ?? 0));
  const outstanding = contractAmount - paidAmount;

  const paidExpenses = payments
    .filter((p) => p.status === "paid" || p.status === "approved")
    .slice()
    .reverse();

  let balance = contractAmount;
  const reconciliationLines = paidExpenses.map((p) => {
    const amt = parseFloat(String(p.amount ?? 0));
    balance -= amt;
    return {
      date: p.date,
      description: p.description,
      amount: amt,
      currency: p.currency,
      balanceAfter: balance,
    };
  });

  const { contractDocumentMeta, ...contractorSafe } = contractor;

  return {
    contractor: {
      ...contractorSafe,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    },
    summary: {
      contractNumber: contractor.contractNumber,
      contractAmount,
      paidAmount,
      outstanding,
      currency: contractor.currency ?? "KGS",
      status: contractor.status,
    },
    payments,
    reconciliation: {
      contractAmount,
      paidAmount,
      outstanding,
      lines: reconciliationLines,
    },
  };
}

async function loadSupplierPortal(companyId: number, supplierId: number) {
  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(
      eq(warehouseSuppliersTable.id, supplierId),
      eq(warehouseSuppliersTable.companyId, companyId),
    ));
  if (!supplier) return null;

  const deliveries = await db.select({
    id: warehouseIncomingTable.id,
    documentDate: warehouseIncomingTable.documentDate,
    documentNumber: warehouseIncomingTable.documentNumber,
    itemName: warehouseItemsTable.name,
    quantity: warehouseIncomingTable.quantity,
    totalAmount: warehouseIncomingTable.totalAmount,
    currency: warehouseIncomingTable.currency,
    notes: warehouseIncomingTable.notes,
  })
    .from(warehouseIncomingTable)
    .leftJoin(warehouseItemsTable, eq(warehouseIncomingTable.itemId, warehouseItemsTable.id))
    .where(and(
      eq(warehouseIncomingTable.supplierId, supplierId),
      eq(warehouseIncomingTable.companyId, companyId),
    ))
    .orderBy(desc(warehouseIncomingTable.documentDate));

  const contractAmount = parseFloat(String(supplier.contractAmount ?? 0));
  const paidAmount = parseFloat(String(supplier.paidAmount ?? 0));
  const outstanding = contractAmount - paidAmount;
  const totalSupplied = deliveries.reduce(
    (sum, d) => sum + parseFloat(String(d.totalAmount ?? 0)),
    0,
  );

  const supplierPayments = await db.select({
    date: warehouseSupplierPaymentsTable.date,
    amount: warehouseSupplierPaymentsTable.amount,
    currency: warehouseSupplierPaymentsTable.currency,
    description: warehouseSupplierPaymentsTable.description,
  })
    .from(warehouseSupplierPaymentsTable)
    .where(and(
      eq(warehouseSupplierPaymentsTable.supplierId, supplierId),
      eq(warehouseSupplierPaymentsTable.companyId, companyId),
    ))
    .orderBy(desc(warehouseSupplierPaymentsTable.date));

  const reconciliation = buildSupplierReconciliation({
    deliveries,
    payments: supplierPayments,
    contractAmount,
    paidAmount,
    currency: supplier.currency ?? "KGS",
  });

  const { contractDocumentMeta, ...supplierSafe } = supplier;

  return {
    supplier: {
      ...supplierSafe,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    },
    summary: {
      contractNumber: supplier.contractNumber,
      contractAmount,
      paidAmount,
      outstanding,
      totalSupplied,
      currency: supplier.currency ?? "KGS",
      isActive: supplier.isActive,
    },
    deliveries,
    payments: supplierPayments,
    reconciliation,
  };
}

async function loadTenantPortal(companyId: number, tenantId: number) {
  const [tenant] = await db.select().from(tenantsTable)
    .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.companyId, companyId)));
  if (!tenant) return null;

  const contracts = await db.select({
    id: leaseContractsTable.id,
    propertyId: leaseContractsTable.propertyId,
    startDate: leaseContractsTable.startDate,
    endDate: leaseContractsTable.endDate,
    rentAmount: leaseContractsTable.rentAmount,
    status: leaseContractsTable.status,
    contractNumber: leaseContractsTable.contractNumber,
    propertyName: propertiesTable.projectName,
    propertyUnit: propertiesTable.unitNumber,
  })
    .from(leaseContractsTable)
    .leftJoin(propertiesTable, eq(leaseContractsTable.propertyId, propertiesTable.id))
    .where(eq(leaseContractsTable.tenantId, tenantId));

  const contractIds = contracts.map((c) => c.id);
  const payments: any[] = contractIds.length > 0
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.leaseContractId, contractIds[0]))
    : [];
  const accruals: any[] = contractIds.length > 0
    ? await db.select().from(accrualsTable).where(eq(accrualsTable.leaseContractId, contractIds[0]))
    : [];

  return { tenant, contracts, payments, accruals };
}

// POST /portal/create-investor-account — phone-first
router.post("/portal/create-investor-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { investorId, phone, email, firstName, lastName } = req.body;
  if (!investorId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "investorId, телефон, имя, фамилия обязательны" }); return;
  }

  const [investor] = await db.select().from(investorsTable)
    .where(and(eq(investorsTable.id, investorId), eq(investorsTable.companyId, req.scopedCompanyId!)));
  if (!investor) { res.status(404).json({ error: "Инвестор не найден" }); return; }

  let user: typeof usersTable.$inferSelect;
  let created: boolean;
  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "investor",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedInvestorId",
      linkedEntityId: investorId,
    });
    user = result.user;
    created = result.created;
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
    return;
  }

  const { passwordHash: _ph, ...safeUser } = user;
  res.status(created ? 201 : 200).json({ user: safeUser, created });
});

// POST /portal/create-tenant-account — phone-first
router.post("/portal/create-tenant-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { tenantId, phone, email, firstName, lastName } = req.body;
  if (!tenantId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "tenantId, телефон, имя, фамилия обязательны" }); return;
  }

  const [tenant] = await db.select().from(tenantsTable)
    .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.companyId, req.scopedCompanyId!)));
  if (!tenant) { res.status(404).json({ error: "Арендатор не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "tenant",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedTenantId",
      linkedEntityId: tenantId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// POST /portal/create-contractor-account — phone-first
router.post("/portal/create-contractor-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { contractorId, phone, email, firstName, lastName } = req.body;
  if (!contractorId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "contractorId, телефон, имя, фамилия обязательны" }); return;
  }

  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(eq(constructionContractorsTable.id, contractorId), eq(constructionContractorsTable.companyId, req.scopedCompanyId!)));
  if (!contractor) { res.status(404).json({ error: "Подрядчик не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "contractor",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedContractorId",
      linkedEntityId: contractorId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/investor/me — данные для портала инвестора (только свои)
router.get("/portal/investor/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "investor" || !me.linkedInvestorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const data = await loadInvestorPortal(req.scopedCompanyId!, me.linkedInvestorId);
  if (!data) {
    res.status(404).json({ error: "Инвестор не найден" }); return;
  }

  res.json(data);
});

// GET /portal/investor/preview/:investorId — предпросмотр для админа
router.get("/portal/investor/preview/:investorId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const investorId = Number(req.params.investorId);
  const data = await loadInvestorPortal(req.scopedCompanyId!, investorId);
  if (!data) { res.status(404).json({ error: "Инвестор не найден" }); return; }
  res.json({ ...data, preview: true });
});

// GET /portal/tenant/me — данные для портала арендатора (только свои)
router.get("/portal/tenant/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "tenant" || !me.linkedTenantId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }
  const data = await loadTenantPortal(req.scopedCompanyId!, me.linkedTenantId);
  if (!data) { res.status(404).json({ error: "Арендатор не найден" }); return; }
  res.json(data);
});

// GET /portal/tenant/preview/:tenantId — предпросмотр для админа
router.get("/portal/tenant/preview/:tenantId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const tenantId = parseInt(req.params.tenantId as string, 10);
  if (!tenantId) { res.status(400).json({ error: "tenantId обязателен" }); return; }
  const data = await loadTenantPortal(req.scopedCompanyId!, tenantId);
  if (!data) { res.status(404).json({ error: "Арендатор не найден" }); return; }
  res.json({ ...data, preview: true });
});

// GET /portal/contractor/me — портал подрядчика
router.get("/portal/contractor/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "contractor" || !me.linkedContractorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }
  const data = await loadContractorPortal(req.scopedCompanyId!, me.linkedContractorId);
  if (!data) { res.status(404).json({ error: "Подрядчик не найден" }); return; }
  res.json(data);
});

// GET /portal/contractor/preview/:contractorId — предпросмотр для админа
router.get("/portal/contractor/preview/:contractorId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const contractorId = parseInt(req.params.contractorId as string, 10);
  if (!contractorId) { res.status(400).json({ error: "contractorId обязателен" }); return; }
  const data = await loadContractorPortal(req.scopedCompanyId!, contractorId);
  if (!data) { res.status(404).json({ error: "Подрядчик не найден" }); return; }
  res.json({ ...data, preview: true });
});

// GET /portal/contractor/contract-document — скачать договор
router.get("/portal/contractor/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "contractor" || !me.linkedContractorId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [contractor] = await db.select().from(constructionContractorsTable)
    .where(and(
      eq(constructionContractorsTable.id, me.linkedContractorId),
      eq(constructionContractorsTable.companyId, req.scopedCompanyId!),
    ));
  if (!contractor) {
    res.status(404).json({ error: "Подрядчик не найден" }); return;
  }

  const doc = parseContractDocumentMeta(contractor.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

// POST /portal/create-supplier-account — phone-first
router.post("/portal/create-supplier-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { supplierId, phone, email, firstName, lastName } = req.body;
  if (!supplierId || !phone || !firstName || !lastName) {
    res.status(400).json({ error: "supplierId, телефон, имя, фамилия обязательны" }); return;
  }

  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(eq(warehouseSuppliersTable.id, supplierId), eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!)));
  if (!supplier) { res.status(404).json({ error: "Поставщик не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId: req.scopedCompanyId!,
      role: "supplier",
      firstName, lastName, phone, email: email || null,
      linkedEntityKey: "linkedSupplierId",
      linkedEntityId: supplierId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    res.status(result.created ? 201 : 200).json({ user: safeUser, created: result.created });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/supplier/me — портал поставщика
router.get("/portal/supplier/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "supplier" || !me.linkedSupplierId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }
  const data = await loadSupplierPortal(req.scopedCompanyId!, me.linkedSupplierId);
  if (!data) { res.status(404).json({ error: "Поставщик не найден" }); return; }
  res.json(data);
});

// GET /portal/supplier/preview/:supplierId — предпросмотр для админа
router.get("/portal/supplier/preview/:supplierId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const supplierId = parseInt(req.params.supplierId as string, 10);
  if (!supplierId) { res.status(400).json({ error: "supplierId обязателен" }); return; }
  const data = await loadSupplierPortal(req.scopedCompanyId!, supplierId);
  if (!data) { res.status(404).json({ error: "Поставщик не найден" }); return; }
  res.json({ ...data, preview: true });
});

// GET /portal/supplier/contract-document
router.get("/portal/supplier/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "supplier" || !me.linkedSupplierId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [supplier] = await db.select().from(warehouseSuppliersTable)
    .where(and(
      eq(warehouseSuppliersTable.id, me.linkedSupplierId),
      eq(warehouseSuppliersTable.companyId, req.scopedCompanyId!),
    ));
  if (!supplier) {
    res.status(404).json({ error: "Поставщик не найден" }); return;
  }

  const doc = parseContractDocumentMeta(supplier.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

// POST /portal/create-buyer-account — phone-first (OTP логин)
router.post("/portal/create-buyer-account", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { buyerId: buyerIdRaw, contractId, buyerName, email, firstName, lastName, phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Телефон обязателен" }); return;
  }
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Имя и фамилия обязательны" }); return;
  }

  const companyId = req.scopedCompanyId!;
  let buyerId: number | null = buyerIdRaw ? Number(buyerIdRaw) : null;

  // Если buyerId не передан — найдём/создадим контрагента-покупателя
  if (!buyerId) {
    if (contractId) {
      const [contract] = await db.select().from(constructionSalesContractsTable)
        .where(and(
          eq(constructionSalesContractsTable.id, Number(contractId)),
          eq(constructionSalesContractsTable.companyId, companyId),
        ));
      if (contract?.buyerId) buyerId = contract.buyerId;

      if (!buyerId && contract) {
        const name = buyerName || contract.buyerName || `${firstName} ${lastName}`;
        const [created] = await db.insert(counterpartiesTable).values({
          companyId,
          category: "buyer",
          categories: ["buyer"],
          fullName: name,
          phone: phone || contract.buyerPhone || null,
        } as any).returning();
        buyerId = created.id;
        await db.update(constructionSalesContractsTable)
          .set({ buyerId })
          .where(eq(constructionSalesContractsTable.id, contract.id));
      }
    }

    if (!buyerId && buyerName) {
      const [created] = await db.insert(counterpartiesTable).values({
        companyId,
        category: "buyer",
        categories: ["buyer"],
        fullName: buyerName,
        phone: phone || null,
      } as any).returning();
      buyerId = created.id;
    }
  }

  if (!buyerId) {
    res.status(400).json({ error: "Не указан покупатель (buyerId, contractId или buyerName)" });
    return;
  }

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(
      eq(counterpartiesTable.id, buyerId),
      eq(counterpartiesTable.companyId, companyId),
    ));
  if (!buyer) { res.status(404).json({ error: "Покупатель не найден" }); return; }

  try {
    const result = await createPortalUser({
      companyId,
      role: "buyer",
      firstName,
      lastName,
      phone,
      email: email || null,
      linkedEntityKey: "linkedBuyerId",
      linkedEntityId: buyerId,
    });
    const { passwordHash: _ph, ...safeUser } = result.user;
    const origin = (req.headers.origin as string) || "https://proptech-sigma-eight.vercel.app";
    res.status(result.created ? 201 : 200).json({
      user: safeUser,
      loginUrl: `${origin}/portal-login`,
      created: result.created,
    });
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "Не удалось создать аккаунт" });
  }
});

// GET /portal/buyer/me — портал покупателя
router.get("/portal/buyer/me", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "buyer" || !me.linkedBuyerId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(
      eq(counterpartiesTable.id, me.linkedBuyerId),
      eq(counterpartiesTable.companyId, req.scopedCompanyId!),
    ));
  if (!buyer) {
    res.status(404).json({ error: "Покупатель не найден" }); return;
  }

  const contracts = await db.select({
    id: constructionSalesContractsTable.id,
    contractNumber: constructionSalesContractsTable.contractNumber,
    status: constructionSalesContractsTable.status,
    totalAmount: constructionSalesContractsTable.totalAmount,
    downPayment: constructionSalesContractsTable.downPayment,
    paidAmount: constructionSalesContractsTable.paidAmount,
    remainingAmount: constructionSalesContractsTable.remainingAmount,
    currency: constructionSalesContractsTable.currency,
    contractDate: constructionSalesContractsTable.contractDate,
    signedAt: constructionSalesContractsTable.signedAt,
    handoverDate: constructionSalesContractsTable.handoverDate,
    unitId: constructionSalesContractsTable.unitId,
    projectId: constructionSalesContractsTable.projectId,
    contractDocumentMeta: constructionSalesContractsTable.contractDocumentMeta,
    projectName: constructionProjectsTable.name,
    unitNumber: constructionUnitsTable.unitNumber,
  })
    .from(constructionSalesContractsTable)
    .leftJoin(constructionProjectsTable, eq(constructionSalesContractsTable.projectId, constructionProjectsTable.id))
    .leftJoin(constructionUnitsTable, eq(constructionSalesContractsTable.unitId, constructionUnitsTable.id))
    .where(and(
      eq(constructionSalesContractsTable.buyerId, me.linkedBuyerId),
      eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
    ))
    .orderBy(desc(constructionSalesContractsTable.createdAt));

  const contractIds = contracts.map((c) => c.id);
  const accruals = contractIds.length > 0
    ? await db.select().from(constructionAccrualsTable)
        .where(and(
          eq(constructionAccrualsTable.companyId, req.scopedCompanyId!),
          inArray(constructionAccrualsTable.contractId, contractIds),
        ))
        .orderBy(constructionAccrualsTable.dueDate)
    : [];

  const payments = contractIds.length > 0
    ? await db.select({
        id: constructionOperationsTable.id,
        date: constructionOperationsTable.date,
        description: constructionOperationsTable.description,
        amount: constructionOperationsTable.amount,
        currency: constructionOperationsTable.currency,
        paymentMethod: constructionOperationsTable.paymentMethod,
        contractId: constructionOperationsTable.contractId,
      })
        .from(constructionOperationsTable)
        .where(and(
          eq(constructionOperationsTable.companyId, req.scopedCompanyId!),
          eq(constructionOperationsTable.type, "income"),
          inArray(constructionOperationsTable.contractId, contractIds),
        ))
        .orderBy(desc(constructionOperationsTable.date))
    : [];

  const totalCharged = accruals.reduce(
    (s, a) => s + parseFloat(String(a.amount ?? 0)),
    0,
  );
  const totalPaid = payments.reduce(
    (s, p) => s + parseFloat(String(p.amount ?? 0)),
    0,
  );
  const contractAmount = contracts.reduce(
    (s, c) => s + parseFloat(String(c.totalAmount ?? 0)),
    0,
  );
  const currency = contracts[0]?.currency ?? "KGS";

  const reconciliation = buildBuyerReconciliation({
    accruals,
    payments,
    contractAmount,
    totalCharged,
    totalPaid,
    currency,
  });

  res.json({
    buyer,
    contracts: contracts.map(({ contractDocumentMeta, ...c }) => ({
      ...c,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    })),
    accruals,
    payments,
    summary: {
      contractAmount,
      totalCharged,
      totalPaid,
      outstanding: totalCharged - totalPaid,
      currency,
      activeContracts: contracts.filter((c) => c.status === "signed" || c.status === "review").length,
    },
    reconciliation,
  });
});

// GET /portal/buyer/preview/:buyerId — предпросмотр портала покупателя для админа
router.get("/portal/buyer/preview/:buyerId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const buyerId = parseInt(req.params.buyerId as string, 10);
  if (!buyerId) { res.status(400).json({ error: "buyerId обязателен" }); return; }
  const companyId = req.scopedCompanyId!;

  const [buyer] = await db.select().from(counterpartiesTable)
    .where(and(eq(counterpartiesTable.id, buyerId), eq(counterpartiesTable.companyId, companyId)));
  if (!buyer) { res.status(404).json({ error: "Покупатель не найден" }); return; }

  const contracts = await db.select({
    id: constructionSalesContractsTable.id,
    contractNumber: constructionSalesContractsTable.contractNumber,
    status: constructionSalesContractsTable.status,
    totalAmount: constructionSalesContractsTable.totalAmount,
    downPayment: constructionSalesContractsTable.downPayment,
    paidAmount: constructionSalesContractsTable.paidAmount,
    remainingAmount: constructionSalesContractsTable.remainingAmount,
    currency: constructionSalesContractsTable.currency,
    contractDate: constructionSalesContractsTable.contractDate,
    signedAt: constructionSalesContractsTable.signedAt,
    handoverDate: constructionSalesContractsTable.handoverDate,
    unitId: constructionSalesContractsTable.unitId,
    projectId: constructionSalesContractsTable.projectId,
    contractDocumentMeta: constructionSalesContractsTable.contractDocumentMeta,
    projectName: constructionProjectsTable.name,
    unitNumber: constructionUnitsTable.unitNumber,
  })
    .from(constructionSalesContractsTable)
    .leftJoin(constructionProjectsTable, eq(constructionSalesContractsTable.projectId, constructionProjectsTable.id))
    .leftJoin(constructionUnitsTable, eq(constructionSalesContractsTable.unitId, constructionUnitsTable.id))
    .where(and(
      eq(constructionSalesContractsTable.buyerId, buyerId),
      eq(constructionSalesContractsTable.companyId, companyId),
    ))
    .orderBy(desc(constructionSalesContractsTable.createdAt));

  const contractIds = contracts.map((c) => c.id);
  const accruals = contractIds.length > 0
    ? await db.select().from(constructionAccrualsTable)
        .where(and(
          eq(constructionAccrualsTable.companyId, companyId),
          inArray(constructionAccrualsTable.contractId, contractIds),
        ))
        .orderBy(constructionAccrualsTable.dueDate)
    : [];

  const payments = contractIds.length > 0
    ? await db.select({
        id: constructionOperationsTable.id,
        date: constructionOperationsTable.date,
        description: constructionOperationsTable.description,
        amount: constructionOperationsTable.amount,
        currency: constructionOperationsTable.currency,
        paymentMethod: constructionOperationsTable.paymentMethod,
        contractId: constructionOperationsTable.contractId,
      })
        .from(constructionOperationsTable)
        .where(and(
          eq(constructionOperationsTable.companyId, companyId),
          eq(constructionOperationsTable.type, "income"),
          inArray(constructionOperationsTable.contractId, contractIds),
        ))
        .orderBy(desc(constructionOperationsTable.date))
    : [];

  const totalCharged = accruals.reduce((s, a) => s + parseFloat(String(a.amount ?? 0)), 0);
  const totalPaid = payments.reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0);
  const contractAmount = contracts.reduce((s, c) => s + parseFloat(String(c.totalAmount ?? 0)), 0);
  const currency = contracts[0]?.currency ?? "KGS";

  const reconciliation = buildBuyerReconciliation({
    accruals, payments, contractAmount, totalCharged, totalPaid, currency,
  });

  res.json({
    buyer,
    contracts: contracts.map(({ contractDocumentMeta, ...c }) => ({
      ...c,
      contractDocument: summarizeContractDocument(contractDocumentMeta),
    })),
    accruals,
    payments,
    summary: {
      contractAmount, totalCharged, totalPaid,
      outstanding: totalCharged - totalPaid,
      currency,
      activeContracts: contracts.filter((c) => c.status === "signed" || c.status === "review").length,
    },
    reconciliation,
    preview: true,
  });
});

// GET /portal/buyer/contract-document?contractId=
router.get("/portal/buyer/contract-document", async (req: AuthenticatedRequest, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!me || me.role !== "buyer" || !me.linkedBuyerId) {
    res.status(403).json({ error: "Нет доступа" }); return;
  }

  const contractId = parseInt(String(req.query.contractId || ""), 10);
  if (!contractId) {
    res.status(400).json({ error: "Укажите contractId" }); return;
  }

  const [contract] = await db.select().from(constructionSalesContractsTable)
    .where(and(
      eq(constructionSalesContractsTable.id, contractId),
      eq(constructionSalesContractsTable.buyerId, me.linkedBuyerId),
      eq(constructionSalesContractsTable.companyId, req.scopedCompanyId!),
    ));
  if (!contract) {
    res.status(404).json({ error: "Договор не найден" }); return;
  }

  const doc = parseContractDocumentMeta(contract.contractDocumentMeta);
  if (!doc) {
    res.status(404).json({ error: "Договор не загружен" }); return;
  }
  res.json(doc);
});

// GET /portal/account-status/:type/:id — есть ли уже доступ в портал у контрагента
router.get("/portal/account-status/:type/:id", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const type = String(req.params.type);
  const id = parseInt(req.params.id as string, 10);
  const linkedKey = LINKED_KEY_BY_TYPE[type];
  if (!linkedKey || !id) {
    res.status(400).json({ error: "Некорректный type или id" }); return;
  }
  const user = await findUserByLinkedEntity(req.scopedCompanyId!, linkedKey, id);
  if (!user) { res.json({ exists: false }); return; }
  res.json({
    exists: true,
    userId: user.id,
    phone: user.phone ?? null,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    isActive: user.isActive,
  });
});

// ── PORTAL CONTENT (медиацентр) ──────────────────────────────────────────────
// Контент, который клиенты видят в своих порталах. Scoped по компании.

type PortalContentBody = {
  type?: string;
  status?: string;
  audience?: string;
  placement?: string | null;
  title?: string;
  body?: string;
  projectName?: string | null;
  imageUrl?: string | null;
  priceLabel?: string | null;
  rewardPoints?: number | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  pollOptions?: string[] | null;
  pinned?: boolean;
  publishAt?: string | null;
  expiresAt?: string | null;
};

/** Normalize writable fields from the request body into DB column values. */
function normalizePortalContent(body: PortalContentBody) {
  const toDate = (v?: string | null) => (v ? new Date(v) : null);
  return {
    type: body.type ?? "news",
    status: body.status ?? "draft",
    audience: body.audience ?? "all",
    placement: body.placement ?? "home",
    title: (body.title ?? "").trim(),
    body: (body.body ?? "").trim(),
    projectName: body.projectName ?? null,
    imageUrl: body.imageUrl ?? null,
    priceLabel: body.priceLabel ?? null,
    rewardPoints:
      body.rewardPoints == null ? null : Number(body.rewardPoints) || 0,
    ctaLabel: body.ctaLabel ?? null,
    ctaUrl: body.ctaUrl ?? null,
    pollOptions: Array.isArray(body.pollOptions)
      ? body.pollOptions.filter((o) => typeof o === "string")
      : null,
    pinned: Boolean(body.pinned),
    publishAt: toDate(body.publishAt) ?? new Date(),
    expiresAt: toDate(body.expiresAt),
  };
}

// GET /portal-content — список материалов компании (для админа и порталов клиентов)
// SECURITY RULE: non-privileged callers (portal clients, regular employees) always see
// only published content regardless of any ?status= they pass.
// Only admin / company_admin / owner may request other statuses or see all when omitted.
router.get("/portal-content", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const audience = typeof req.query.audience === "string" ? req.query.audience : undefined;

  const PRIVILEGED_ROLES = ["admin", "company_admin", "owner"];
  const isPrivileged = PRIVILEGED_ROLES.includes(req.userRole ?? "");
  // Privileged users: honour the ?status= param (or see all when omitted).
  // Everyone else: forcibly restrict to published — never expose drafts.
  const requestedStatus = typeof req.query.status === "string" ? req.query.status : undefined;
  const status: string | undefined = isPrivileged ? requestedStatus : "published";

  const filters = [eq(portalContentTable.companyId, companyId)];
  if (audience) filters.push(eq(portalContentTable.audience, audience));
  if (status) filters.push(eq(portalContentTable.status, status));

  const rows = await db
    .select()
    .from(portalContentTable)
    .where(and(...filters))
    .orderBy(desc(portalContentTable.pinned), desc(portalContentTable.publishAt));

  res.json(rows);
});

// POST /portal-content — создать материал (только админ компании)
router.post("/portal-content", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const values = normalizePortalContent(req.body ?? {});
  if (!values.title) {
    res.status(400).json({ error: "Укажите заголовок" }); return;
  }
  const [row] = await db.insert(portalContentTable).values({
    companyId: req.scopedCompanyId!,
    ...values,
  }).returning();
  if (row.status === "published") {
    notifyPortalPublish(row).catch(() => {});
  }
  res.status(201).json(row);
});

// PUT /portal-content/:id — обновить материал (только админ компании)
router.put("/portal-content/:id", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!id) { res.status(400).json({ error: "Некорректный id" }); return; }

  // Fetch old status to detect publish transition (idempotent-ish)
  const [existing] = await db.select({ status: portalContentTable.status })
    .from(portalContentTable)
    .where(and(eq(portalContentTable.id, id), eq(portalContentTable.companyId, req.scopedCompanyId!)));
  const wasPublished = existing?.status === "published";

  const values = normalizePortalContent(req.body ?? {});
  if (!values.title) {
    res.status(400).json({ error: "Укажите заголовок" }); return;
  }
  const [row] = await db.update(portalContentTable)
    .set(values)
    .where(and(
      eq(portalContentTable.id, id),
      eq(portalContentTable.companyId, req.scopedCompanyId!),
    ))
    .returning();
  if (!row) { res.status(404).json({ error: "Материал не найден" }); return; }

  // Notify on transition draft→published (not if already was published)
  if (!wasPublished && row.status === "published") {
    notifyPortalPublish(row).catch(() => {});
  }

  res.json(row);
});

// DELETE /portal-content/:id — удалить материал (только админ компании)
router.delete("/portal-content/:id", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!id) { res.status(400).json({ error: "Некорректный id" }); return; }
  await db.delete(portalContentTable)
    .where(and(
      eq(portalContentTable.id, id),
      eq(portalContentTable.companyId, req.scopedCompanyId!),
    ));
  res.json({ ok: true });
});

// ── Portal Access (source of truth in DB, replaces localStorage) ─────────────

// GET /portal-access — list all portal access records for the scoped company
router.get("/portal-access", async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const rows = await db
    .select()
    .from(portalAccessTable)
    .where(eq(portalAccessTable.companyId, companyId));
  res.json(rows);
});

// POST /portal-access — upsert by (companyId, counterpartyId)
// Body: { counterpartyId, portalKind, accessCode?, isActive? }
router.post("/portal-access", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const body = req.body ?? {};
  const counterpartyId = Number(body.counterpartyId);
  if (!counterpartyId) { res.status(400).json({ error: "counterpartyId required" }); return; }
  const portalKind = typeof body.portalKind === "string" ? body.portalKind : null;
  if (!portalKind) { res.status(400).json({ error: "portalKind required" }); return; }

  const [existing] = await db
    .select()
    .from(portalAccessTable)
    .where(and(
      eq(portalAccessTable.companyId, companyId),
      eq(portalAccessTable.counterpartyId, counterpartyId),
    ));

  if (existing) {
    const [updated] = await db
      .update(portalAccessTable)
      .set({
        portalKind,
        accessCode: typeof body.accessCode === "string" ? body.accessCode : existing.accessCode,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(portalAccessTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [inserted] = await db
      .insert(portalAccessTable)
      .values({
        companyId,
        counterpartyId,
        portalKind,
        accessCode: typeof body.accessCode === "string" ? body.accessCode : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      })
      .returning();
    res.status(201).json(inserted);
  }
});

// DELETE /portal-access/:counterpartyId — soft-delete (set isActive=false)
router.delete("/portal-access/:counterpartyId", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const companyId = req.scopedCompanyId!;
  const counterpartyId = parseInt(req.params.counterpartyId as string, 10);
  if (!counterpartyId) { res.status(400).json({ error: "Некорректный counterpartyId" }); return; }
  const [row] = await db
    .update(portalAccessTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(portalAccessTable.companyId, companyId),
      eq(portalAccessTable.counterpartyId, counterpartyId),
    ))
    .returning();
  if (!row) { res.status(404).json({ error: "Portal access not found" }); return; }
  res.json({ ok: true });
});

// ── PORTAL ENGAGEMENT ────────────────────────────────────────────────────────

// POST /portal-content/upload — загрузить изображение (только admin/company_admin)
router.post("/portal-content/upload", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!isBlobEnabled()) {
    res.status(400).json({ error: "Хранилище файлов не настроено" }); return;
  }
  const { filename, dataBase64, contentType } = req.body ?? {};
  if (!filename || !dataBase64) {
    res.status(400).json({ error: "filename и dataBase64 обязательны" }); return;
  }
  const mimeType = contentType || "application/octet-stream";
  const result = await uploadFile({
    fileName: filename,
    mimeType,
    base64: dataBase64,
    pathname: "portal-images",
  });
  res.json({ url: result.url });
});

// POST /portal-content/:id/vote — проголосовать в опросе
router.post("/portal-content/:id/vote", async (req: AuthenticatedRequest, res): Promise<void> => {
  const contentId = parseInt(req.params.id as string, 10);
  if (!contentId) { res.status(400).json({ error: "Некорректный id" }); return; }
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  const [content] = await db.select()
    .from(portalContentTable)
    .where(and(eq(portalContentTable.id, contentId), eq(portalContentTable.companyId, companyId)));
  if (!content) { res.status(404).json({ error: "Материал не найден" }); return; }
  if (content.type !== "poll") { res.status(400).json({ error: "Материал не является опросом" }); return; }

  const options = Array.isArray(content.pollOptions) ? content.pollOptions as string[] : [];
  const { optionIndex } = req.body ?? {};
  if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= options.length) {
    res.status(400).json({ error: "optionIndex вне допустимого диапазона" }); return;
  }

  // Upsert: insert or update if vote changed
  await db.insert(portalPollVotesTable).values({
    companyId,
    contentId,
    voterUserId: userId,
    optionIndex,
  }).onConflictDoUpdate({
    target: [portalPollVotesTable.contentId, portalPollVotesTable.voterUserId],
    set: { optionIndex },
  });

  // Compute counts
  const votes = await db.select()
    .from(portalPollVotesTable)
    .where(eq(portalPollVotesTable.contentId, contentId));

  const counts = options.map((_: string, i: number) =>
    votes.filter((v) => v.optionIndex === i).length
  );
  const total = votes.length;

  res.json({ counts, total, myVote: optionIndex });
});

// GET /portal-content/:id/poll — получить статус опроса
router.get("/portal-content/:id/poll", async (req: AuthenticatedRequest, res): Promise<void> => {
  const contentId = parseInt(req.params.id as string, 10);
  if (!contentId) { res.status(400).json({ error: "Некорректный id" }); return; }
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  const [content] = await db.select()
    .from(portalContentTable)
    .where(and(eq(portalContentTable.id, contentId), eq(portalContentTable.companyId, companyId)));
  if (!content) { res.status(404).json({ error: "Материал не найден" }); return; }
  if (content.type !== "poll") { res.status(400).json({ error: "Материал не является опросом" }); return; }

  const options = Array.isArray(content.pollOptions) ? content.pollOptions as string[] : [];

  const votes = await db.select()
    .from(portalPollVotesTable)
    .where(eq(portalPollVotesTable.contentId, contentId));

  const counts = options.map((_: string, i: number) =>
    votes.filter((v) => v.optionIndex === i).length
  );
  const total = votes.length;

  const myVoteRow = votes.find((v) => v.voterUserId === userId);
  const myVote = myVoteRow != null ? myVoteRow.optionIndex : null;

  res.json({ options, counts, total, myVote });
});

// POST /portal-content/:id/read — зафиксировать прочтение
router.post("/portal-content/:id/read", async (req: AuthenticatedRequest, res): Promise<void> => {
  const contentId = parseInt(req.params.id as string, 10);
  if (!contentId) { res.status(400).json({ error: "Некорректный id" }); return; }
  const companyId = req.scopedCompanyId!;
  const userId = req.userId!;

  // Idempotent: DO NOTHING on conflict
  await db.insert(portalContentReadsTable).values({
    companyId,
    contentId,
    viewerUserId: userId,
  }).onConflictDoNothing();

  res.json({ ok: true });
});

// GET /portal-content/:id/analytics — аналитика прочтений (только admin/company_admin)
router.get("/portal-content/:id/analytics", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const contentId = parseInt(req.params.id as string, 10);
  if (!contentId) { res.status(400).json({ error: "Некорректный id" }); return; }
  const companyId = req.scopedCompanyId!;

  const reads = await db.select()
    .from(portalContentReadsTable)
    .where(and(
      eq(portalContentReadsTable.contentId, contentId),
      eq(portalContentReadsTable.companyId, companyId),
    ));

  res.json({
    reads: reads.length,
    uniqueViewers: reads.length, // Each row is unique per (contentId, viewerUserId) by design
  });
});

export default router;
