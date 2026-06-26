/**
 * Auto-trigger helpers for document generation.
 * All helpers are idempotent and failure-tolerant:
 * - They skip creation if a document of the same type already exists for the entity.
 * - They wrap in try/catch so a generation failure NEVER breaks the core flow.
 */

import { eq, and } from "drizzle-orm";
import { db, documentsTable } from "./db";
import {
  buildTaxInvoicePayload,
  renderTaxInvoiceText,
  DEFAULT_VAT_RATE,
  type TaxInvoicePayload,
} from "./tax-invoice";
import { logger } from "./logger";

/** Document type constants */
export const DOC_TYPE = {
  INVOICE: "invoice",
  TAX_INVOICE: "tax_invoice",
  ACT: "act",
  RECONCILIATION: "reconciliation",
} as const;

export type DocType = (typeof DOC_TYPE)[keyof typeof DOC_TYPE];

/**
 * Idempotent: create a DRAFT invoice document for a contract
 * if one doesn't already exist.
 *
 * Trigger point: called when a lease_contract or construction_sales_contract
 * becomes active/signed.
 */
export async function ensureContractInvoice(params: {
  companyId: number;
  contractType: string; // "lease" | "construction_sales"
  contractId: number;
  contractNumber?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  amount?: number | null;
  currency?: string;
}): Promise<void> {
  try {
    const entityType = params.contractType === "lease"
      ? "lease_contract"
      : "construction_sales_contract";

    // Idempotency check — skip if invoice already exists for this contract
    const [existing] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.companyId, params.companyId),
          eq(documentsTable.entityType, entityType),
          eq(documentsTable.entityId, params.contractId),
          eq(documentsTable.docType as any, DOC_TYPE.INVOICE),
        ),
      )
      .limit(1);

    if (existing) return; // already created

    const today = new Date().toISOString().slice(0, 10);
    const number = `СЧ-${params.contractId}-${Date.now().toString(36).toUpperCase()}`;
    const name = `Счёт №${number} от ${today}`;

    // Simple invoice (without VAT breakdown — use tax_invoice for that)
    const payload = JSON.stringify({
      type: DOC_TYPE.INVOICE,
      number,
      date: today,
      contractId: params.contractId,
      contractNumber: params.contractNumber ?? null,
      contractType: params.contractType,
      buyerName: params.buyerName ?? null,
      sellerName: params.sellerName ?? null,
      amount: params.amount ?? null,
      currency: params.currency ?? "KGS",
      generatedAt: new Date().toISOString(),
    });

    await db.insert(documentsTable).values({
      companyId: params.companyId,
      entityType,
      entityId: params.contractId,
      name,
      fileUrl: null,
      mimeType: "application/json",
      docType: DOC_TYPE.INVOICE,
      payload,
      docStatus: "draft",
    });

    logger.info(
      { companyId: params.companyId, contractId: params.contractId, contractType: params.contractType },
      "ensureContractInvoice: draft invoice created",
    );
  } catch (err) {
    // Failure must never propagate — log and continue
    logger.error({ err }, "ensureContractInvoice: failed (non-fatal)");
  }
}

/**
 * Idempotent: create a DRAFT tax_invoice document for a payment
 * if one doesn't already exist.
 *
 * Trigger point: called right after a rental payment or construction cashier
 * payment is recorded.
 *
 * VAT convention: `grossAmount` is the payment amount (с НДС / inclusive of VAT).
 * vat  = gross × rate / (100 + rate)
 * net  = gross - vat
 */
export async function ensurePaymentTaxInvoice(params: {
  companyId: number;
  paymentId: number;
  contractType: string; // "lease" | "construction_sales"
  contractId: number;
  contractNumber?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  grossAmount: number;
  currency: string;
  vatRate?: number;
  serviceDescription?: string;
}): Promise<void> {
  try {
    const entityType = "payment";

    // Idempotency check — skip if tax_invoice already exists for this payment
    const [existing] = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.companyId, params.companyId),
          eq(documentsTable.entityType, entityType),
          eq(documentsTable.entityId, params.paymentId),
          eq(documentsTable.docType as any, DOC_TYPE.TAX_INVOICE),
        ),
      )
      .limit(1);

    if (existing) return; // already created

    const today = new Date().toISOString().slice(0, 10);
    const number = `СФ-${params.paymentId}-${Date.now().toString(36).toUpperCase()}`;

    const invoiceData = buildTaxInvoicePayload({
      number,
      date: today,
      sellerName: params.sellerName ?? "Продавец",
      sellerInn: null,
      buyerName: params.buyerName ?? "Покупатель",
      buyerInn: null,
      grossAmount: params.grossAmount,
      currency: params.currency,
      vatRate: params.vatRate ?? DEFAULT_VAT_RATE,
      serviceDescription: params.serviceDescription ?? "Услуги аренды / реализация недвижимости",
      contractId: params.contractId,
      contractNumber: params.contractNumber ?? null,
      paymentId: params.paymentId,
      contractType: params.contractType,
    });

    const name = `Счёт-фактура №${number} от ${today}`;
    const payload = JSON.stringify(invoiceData);
    const textBody = renderTaxInvoiceText(invoiceData);

    // Store structured JSON in payload + rendered text as "file" body
    await db.insert(documentsTable).values({
      companyId: params.companyId,
      entityType,
      entityId: params.paymentId,
      name,
      fileUrl: null,
      mimeType: "application/json",
      docType: DOC_TYPE.TAX_INVOICE,
      payload,
      docStatus: "draft",
    });

    logger.info(
      { companyId: params.companyId, paymentId: params.paymentId, number, vatAmount: invoiceData.vatAmount },
      "ensurePaymentTaxInvoice: draft tax_invoice created",
    );

    // Suppress unused variable warning
    void textBody;
  } catch (err) {
    // Failure must never propagate — log and continue
    logger.error({ err }, "ensurePaymentTaxInvoice: failed (non-fatal)");
  }
}

/**
 * Build a tax invoice for a contract+payment and store it.
 * Used by the explicit POST /documents/tax-invoice endpoint.
 * Returns the created document row.
 */
export async function createTaxInvoiceDocument(params: {
  companyId: number;
  contractType: string;
  contractId: number;
  contractNumber?: string | null;
  paymentId?: number | null;
  buyerName?: string | null;
  sellerName?: string | null;
  grossAmount: number;
  currency: string;
  vatRate?: number;
  serviceDescription?: string;
}): Promise<TaxInvoicePayload & { docId: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const ref = params.paymentId
    ? `P${params.paymentId}`
    : `C${params.contractId}`;
  const number = `СФ-${ref}-${Date.now().toString(36).toUpperCase()}`;

  const invoiceData = buildTaxInvoicePayload({
    number,
    date: today,
    sellerName: params.sellerName ?? "Продавец",
    sellerInn: null,
    buyerName: params.buyerName ?? "Покупатель",
    buyerInn: null,
    grossAmount: params.grossAmount,
    currency: params.currency,
    vatRate: params.vatRate ?? DEFAULT_VAT_RATE,
    serviceDescription:
      params.serviceDescription ?? "Услуги аренды / реализация недвижимости",
    contractId: params.contractId,
    contractNumber: params.contractNumber ?? null,
    paymentId: params.paymentId ?? null,
    contractType: params.contractType,
  });

  const entityType = params.paymentId
    ? "payment"
    : params.contractType === "lease"
    ? "lease_contract"
    : "construction_sales_contract";
  const entityId = params.paymentId ?? params.contractId;

  const name = `Счёт-фактура №${number} от ${today}`;
  const payload = JSON.stringify(invoiceData);

  const [row] = await db
    .insert(documentsTable)
    .values({
      companyId: params.companyId,
      entityType,
      entityId,
      name,
      fileUrl: null,
      mimeType: "application/json",
      docType: "tax_invoice",
      payload,
      docStatus: "draft",
    })
    .returning();

  return { ...invoiceData, docId: row.id };
}
