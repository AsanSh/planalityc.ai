export type ProjectCurrencyFields = {
	totalArea?: string | null;
	totalConstructionArea?: string | null;
	costPerSqm?: string | null;
	currency?: string | null;
	exchangeRate?: string | null;
	estimatedCostKgs?: string | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
	KGS: "с",
	USD: "$",
	EUR: "€",
	RUB: "₽",
	CNY: "¥",
};

export function currencySymbol(code: string) {
	return CURRENCY_SYMBOL[code] || code;
}

export function fmtProjectAmount(v: string | number | null | undefined) {
	if (v == null || v === "") return "—";
	const n = parseFloat(String(v));
	if (Number.isNaN(n)) return "—";
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function convertProjectAmount(
	amount: number,
	fromCurrency = "KGS",
	toCurrency = "KGS",
	exchangeRate?: string | number | null,
) {
	if (!Number.isFinite(amount)) return 0;
	const from = fromCurrency || "KGS";
	const to = toCurrency || "KGS";
	if (from === to) return amount;
	const rate = parseFloat(String(exchangeRate || "1")) || 1;
	if (from === "USD" && to === "KGS") return amount * rate;
	if (from === "KGS" && to === "USD") return amount / rate;
	return amount;
}

/** Себестоимость в валюте проекта (то, что видит пользователь) */
export function projectCostInCurrency(p: ProjectCurrencyFields) {
	// totalConstructionArea имеет приоритет над устаревшим totalArea
	const area = parseFloat(p.totalConstructionArea || p.totalArea || "0");
	const cps = parseFloat(p.costPerSqm || "0");
	const currency = p.currency || "KGS";
	const rate = parseFloat(p.exchangeRate || "1") || 1;

	if (area > 0 && cps > 0) {
		return { total: area * cps, currency, area, cps };
	}

	const kgs = parseFloat(p.estimatedCostKgs || "0");
	if (kgs <= 0) return { total: 0, currency, area, cps };

	if (currency === "KGS") {
		return { total: kgs, currency, area, cps };
	}
	return { total: kgs / rate, currency, area, cps };
}

export function projectCostBreakdown(p: ProjectCurrencyFields) {
	const { currency, area, cps } = projectCostInCurrency(p);
	if (area <= 0 || cps <= 0) return null;
	const sym = currencySymbol(currency);
	return `${fmtProjectAmount(area)} м² × ${fmtProjectAmount(cps)} ${sym}`;
}

export function projectCostLabel(currency: string) {
	return currency === "KGS" ? "Себестоимость" : `Себестоимость (${currency})`;
}
