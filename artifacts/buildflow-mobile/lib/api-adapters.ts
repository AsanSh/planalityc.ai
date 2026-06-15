/** Нормализация ответов API под UI мобильного приложения. */

export interface DebtReportView {
  totalDebt: number;
  debtorsCount: number;
  items: { tenantName: string; amount: number; contractId: number }[];
}

export function parseDebtReport(raw: unknown): DebtReportView {
  const data = raw as {
    summary?: { totalDebt?: number; totalDebtors?: number };
    rows?: { tenantName?: string; totalDebt?: number; contractId?: number }[];
    totalDebt?: string | number;
    debtorsCount?: number;
    items?: { tenantName: string; amount: string; contractId: number }[];
  };

  if (data.summary) {
    return {
      totalDebt: Number(data.summary.totalDebt ?? 0),
      debtorsCount: Number(data.summary.totalDebtors ?? 0),
      items: (data.rows ?? []).map((row) => ({
        tenantName: row.tenantName ?? "—",
        amount: Number(row.totalDebt ?? 0),
        contractId: Number(row.contractId ?? 0),
      })),
    };
  }

  return {
    totalDebt: Number(data.totalDebt ?? 0),
    debtorsCount: Number(data.debtorsCount ?? 0),
    items: (data.items ?? []).map((item) => ({
      tenantName: item.tenantName,
      amount: Number(item.amount ?? 0),
      contractId: Number(item.contractId ?? 0),
    })),
  };
}

export interface RentalSummaryView {
  totalCharged: number;
  totalPaid: number;
  collectionRate: number;
}

export function parseRentalSummary(raw: unknown): RentalSummaryView {
  const data = raw as {
    summary?: { totalCharged?: number; totalPaid?: number; collectionRate?: number };
    totalCharged?: string | number;
    totalPaid?: string | number;
    collectionRate?: number;
  };

  if (data.summary) {
    return {
      totalCharged: Number(data.summary.totalCharged ?? 0),
      totalPaid: Number(data.summary.totalPaid ?? 0),
      collectionRate: Number(data.summary.collectionRate ?? 0),
    };
  }

  return {
    totalCharged: Number(data.totalCharged ?? 0),
    totalPaid: Number(data.totalPaid ?? 0),
    collectionRate: Number(data.collectionRate ?? 0),
  };
}

export interface CashflowView {
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
}

export function parseCashflow(raw: unknown): CashflowView {
  const data = raw as {
    summary?: { totalInflow?: number; totalOutflow?: number; netCashflow?: number };
    totalInflow?: string | number;
    totalOutflow?: string | number;
    netFlow?: string | number;
  };

  if (data.summary) {
    return {
      totalInflow: Number(data.summary.totalInflow ?? 0),
      totalOutflow: Number(data.summary.totalOutflow ?? 0),
      netFlow: Number(data.summary.netCashflow ?? 0),
    };
  }

  return {
    totalInflow: Number(data.totalInflow ?? 0),
    totalOutflow: Number(data.totalOutflow ?? 0),
    netFlow: Number(data.netFlow ?? 0),
  };
}

export interface PropertyRow {
  id: number;
  unitNumber: string;
  projectName: string;
  block?: string | null;
  floor?: number | null;
  type: string;
  area?: string | null;
  status: string;
  marketValue?: string | null;
  /** Отображаемое имя (unitNumber) */
  name: string;
  price?: string | null;
}

export function mapProperty(row: Record<string, unknown>): PropertyRow {
  return {
    id: Number(row.id),
    unitNumber: String(row.unitNumber ?? ""),
    projectName: String(row.projectName ?? ""),
    block: row.block != null ? String(row.block) : null,
    floor: row.floor != null ? Number(row.floor) : null,
    type: String(row.type ?? "apartment"),
    area: row.area != null ? String(row.area) : null,
    status: String(row.status ?? "available"),
    marketValue: row.marketValue != null ? String(row.marketValue) : null,
    name: String(row.unitNumber ?? row.name ?? "—"),
    price: row.marketValue != null ? String(row.marketValue) : row.price != null ? String(row.price) : null,
  };
}

export interface TenantRow {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  name: string;
}

export function mapTenant(row: Record<string, unknown>): TenantRow {
  const fullName = String(row.fullName ?? row.name ?? "—");
  return {
    id: Number(row.id),
    fullName,
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
    status: String(row.status ?? "inactive"),
    name: fullName,
  };
}

export interface AccrualRow {
  id: number;
  period: string;
  amount: string;
  balance: string;
  status: string;
  dueDate?: string;
  leaseContractId: number;
  month: string;
}

export function mapAccrual(row: Record<string, unknown>): AccrualRow {
  const period = String(row.period ?? row.month ?? "");
  return {
    id: Number(row.id),
    period,
    amount: String(row.amount ?? "0"),
    balance: String(row.balance ?? "0"),
    status: String(row.status ?? "pending"),
    dueDate: row.dueDate != null ? String(row.dueDate) : undefined,
    leaseContractId: Number(row.leaseContractId ?? 0),
    month: period,
  };
}
