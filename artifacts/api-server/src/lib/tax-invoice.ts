/**
 * Tax Invoice (Счёт-фактура с НДС) builder.
 *
 * VAT convention:
 *   The stored `amount` is treated as GROSS (сумма с НДС / брутто).
 *   VAT is extracted from gross using the formula:
 *     vat  = gross * rate / (100 + rate)   — "НДС в т.ч."
 *     net  = gross - vat                   — сумма без НДС
 *
 *   Default KG VAT rate = 12 % (НДС Кыргызстан, ст. 270 НК КР).
 *   Pass vatRate=0 to produce a zero-VAT invoice (без НДС).
 */

export const DEFAULT_VAT_RATE = 12; // percent

export interface TaxInvoiceInput {
  /** Sequential document number (string, e.g. "СФ-2026-0001") */
  number: string;
  /** ISO date string YYYY-MM-DD */
  date: string;

  /** Seller (Продавец) */
  sellerName: string;
  sellerInn?: string | null;

  /** Buyer (Покупатель) */
  buyerName: string;
  buyerInn?: string | null;

  /**
   * Gross amount (с НДС / inclusive of VAT).
   * We always receive the contract/payment amount as gross.
   */
  grossAmount: number;

  currency: string;

  /** VAT rate as a percentage. Default: DEFAULT_VAT_RATE (12). */
  vatRate?: number;

  /** Human-readable description of goods/services (наименование услуги/товара). */
  serviceDescription: string;

  /** Optional reference to source entity */
  contractId?: number | null;
  contractNumber?: string | null;
  paymentId?: number | null;
  contractType?: string | null;
}

export interface TaxInvoicePayload {
  number: string;
  date: string;
  sellerName: string;
  sellerInn: string | null;
  buyerName: string;
  buyerInn: string | null;
  serviceDescription: string;
  currency: string;
  /** Gross amount (с НДС). */
  grossAmount: number;
  /** VAT rate in percent (e.g. 12). */
  vatRate: number;
  /**
   * VAT amount extracted from gross.
   * Formula: vat = gross * rate / (100 + rate)
   */
  vatAmount: number;
  /** Net amount without VAT. Formula: net = gross - vat */
  netAmount: number;
  contractId: number | null;
  contractNumber: string | null;
  paymentId: number | null;
  contractType: string | null;
  generatedAt: string;
}

/**
 * Build a tax invoice payload from input data.
 * All monetary values are rounded to 2 decimal places.
 */
export function buildTaxInvoicePayload(input: TaxInvoiceInput): TaxInvoicePayload {
  const vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
  const gross = input.grossAmount;

  // Extract VAT from gross (НДС в т.ч.):
  //   vat = gross × rate / (100 + rate)
  //   net = gross - vat
  const vatAmount = vatRate > 0
    ? Math.round((gross * vatRate / (100 + vatRate)) * 100) / 100
    : 0;
  const netAmount = Math.round((gross - vatAmount) * 100) / 100;

  return {
    number: input.number,
    date: input.date,
    sellerName: input.sellerName,
    sellerInn: input.sellerInn ?? null,
    buyerName: input.buyerName,
    buyerInn: input.buyerInn ?? null,
    serviceDescription: input.serviceDescription,
    currency: input.currency,
    grossAmount: Math.round(gross * 100) / 100,
    vatRate,
    vatAmount,
    netAmount,
    contractId: input.contractId ?? null,
    contractNumber: input.contractNumber ?? null,
    paymentId: input.paymentId ?? null,
    contractType: input.contractType ?? null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Render a plain-text representation of the tax invoice (used as document body
 * since full PDF rendering is not implemented — see migration notes).
 */
export function renderTaxInvoiceText(p: TaxInvoicePayload): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return [
    `СЧЁТ-ФАКТУРА № ${p.number}`,
    `Дата: ${p.date}`,
    ``,
    `ПРОДАВЕЦ: ${p.sellerName}${p.sellerInn ? ` (ИНН: ${p.sellerInn})` : ""}`,
    `ПОКУПАТЕЛЬ: ${p.buyerName}${p.buyerInn ? ` (ИНН: ${p.buyerInn})` : ""}`,
    ``,
    `Наименование услуги/товара: ${p.serviceDescription}`,
    ``,
    `Сумма без НДС:   ${fmt(p.netAmount)} ${p.currency}`,
    `НДС (${p.vatRate}%):        ${fmt(p.vatAmount)} ${p.currency}`,
    `Итого с НДС:     ${fmt(p.grossAmount)} ${p.currency}`,
    ``,
    p.contractNumber ? `Договор: ${p.contractNumber}` : "",
    `Дата формирования: ${p.generatedAt}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}
