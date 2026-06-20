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
	available: "#22c55e",
	reserved: "#f59e0b",
	sold: "#3b82f6",
	registered: "#3b82f6",
	occupied: "#8b5cf6",
	construction: "#64748b",
	closed: "#94a3b8",
	draft: "#94a3b8",
	unavailable: "#94a3b8",
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

export type UnitsAreaStats = Record<KpiFilter, number>;

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
