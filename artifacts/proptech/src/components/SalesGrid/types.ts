import type { UnitContract } from "@/components/chess-views";

export type SalesGridView = "grid" | "list" | "agents";
export type CellViewMode = "crm" | "pto" | "prices";
export type KpiFilter =
	| "all"
	| "free"
	| "reserved"
	| "sold"
	| "settled"
	| "building"
	| "closed";

export const KPI_LABELS: Record<Exclude<KpiFilter, "all">, string> = {
	free: "Свободно",
	reserved: "Бронь",
	sold: "Продано",
	settled: "Заселено",
	building: "Строится",
	closed: "Закрыто",
};

/** Цвета статусов по спецификации (hex) */
export const STATUS_HEX: Record<string, string> = {
	available: "#16a34a",
	reserved: "#d97706",
	sold: "#2563eb",
	registered: "#2563eb",
	occupied: "#7c3aed",
	construction: "#475569",
	closed: "#64748b",
	draft: "#64748b",
	unavailable: "#64748b",
};

export const STATUS_SURFACE_HEX: Record<string, string> = {
	available: "#ecfdf3",
	reserved: "#fff7ed",
	sold: "#eff6ff",
	registered: "#eff6ff",
	occupied: "#f5f3ff",
	construction: "#f1f5f9",
	closed: "#f8fafc",
	draft: "#f8fafc",
	unavailable: "#f8fafc",
};

export const STATUS_BORDER_HEX: Record<string, string> = {
	available: "#86efac",
	reserved: "#fed7aa",
	sold: "#bfdbfe",
	registered: "#bfdbfe",
	occupied: "#ddd6fe",
	construction: "#cbd5e1",
	closed: "#cbd5e1",
	draft: "#cbd5e1",
	unavailable: "#cbd5e1",
};

export function kpiBucket(status: string): Exclude<KpiFilter, "all"> {
	const map: Record<string, Exclude<KpiFilter, "all">> = {
		available: "free",
		reserved: "reserved",
		sold: "sold",
		registered: "sold",
		occupied: "settled",
		construction: "building",
		closed: "closed",
		draft: "closed",
		unavailable: "closed",
	};
	return map[status] ?? "closed";
}

export interface UnitsStats {
	total: number;
	free: number;
	reserved: number;
	sold: number;
	settled: number;
	building: number;
	closed: number;
}

export interface SalesGridProject {
	id: number;
	name: string;
	totalFloors?: number;
	totalUnits?: number;
	baseSalePricePerSqm?: string | null;
	costPerSqm?: string | null;
	currency?: string;
}

export interface SalesGridUnit {
	id: number;
	projectId: number;
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	unitType: string;
	roomCount?: number | null;
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	basePricePerSqm?: string | null;
	saleCoefficient?: string | null;
	priceCoefficient?: string | null;
	approvedSalePricePerSqm?: string | null;
	approvedTotalPrice?: string | null;
	listPrice?: string | null;
	isPublishedForSale?: boolean | null;
	priceApproved?: boolean;
	currency: string;
	status: string;
	notes?: string | null;
	areaModified?: boolean;
	originalArea?: string | null;
	areaDelta?: string | null;
	contract?: UnitContract | null;
}

export type DrawerTab = "main" | "finance" | "prices" | "docs" | "history";

export const UNIT_TYPES = [
	{ value: "apartment", label: "Квартира" },
	{ value: "studio", label: "Студия" },
	{ value: "office", label: "Офис" },
	{ value: "commercial", label: "Коммерческое" },
	{ value: "parking", label: "Паркинг" },
	{ value: "storage", label: "Кладовая" },
] as const;
