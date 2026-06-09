/** Парсит число из строки с учётом ru-KG: пробелы-разделители и запятая как десятичный разделитель. */
export function parseNum(v: unknown): number {
	const normalized = String(v ?? "")
		.trim()
		.replace(/\s/g, "")
		.replace(",", ".");
	const n = parseFloat(normalized);
	return Number.isFinite(n) ? n : 0;
}

export function canManageUnitPricing(role: string): boolean {
	return ["super_admin", "admin", "company_admin", "owner", "commercial_director"].includes(
		role,
	);
}

export function isSalesOnlyRole(role: string): boolean {
	return role === "sales_manager";
}

export type UnitPriceFields = {
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	approvedSalePricePerSqm?: string | null;
	approvedTotalPrice?: string | null;
	listPrice?: string | null;
	priceApproved?: boolean;
	isPublishedForSale?: boolean | null;
};

export function isUnitPublishedForSale(unit: UnitPriceFields): boolean {
	if (unit.priceApproved === true) {
		return (
			parseNum(
				unit.approvedSalePricePerSqm || unit.pricePerSqm || unit.listPrice,
			) > 0
		);
	}
	return (
		unit.isPublishedForSale === true &&
		parseNum(unit.approvedSalePricePerSqm || unit.pricePerSqm) > 0
	);
}

export function hasUnitSalePrice(unit: UnitPriceFields): boolean {
	return parseNum(unit.approvedSalePricePerSqm || unit.pricePerSqm || unit.listPrice) > 0;
}

export function resolvedPricePerSqm(unit: UnitPriceFields): number {
	return parseNum(unit.approvedSalePricePerSqm || unit.pricePerSqm || unit.listPrice);
}

export function resolvedTotalPrice(unit: UnitPriceFields): number {
	const explicit = parseNum(unit.approvedTotalPrice || unit.totalPrice);
	if (explicit > 0) return explicit;
	const area = parseNum(unit.area);
	const pps = resolvedPricePerSqm(unit);
	return area > 0 && pps > 0 ? area * pps : 0;
}

export function formatPriceSom(v: number): string {
	if (!Number.isFinite(v) || v <= 0) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v)} сом`;
}

export function formatPricePerSqmCompact(v: number): string {
	if (!Number.isFinite(v) || v <= 0) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v)}/м²`;
}
