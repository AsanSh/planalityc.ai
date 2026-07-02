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
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
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

/**
 * Эффективный курс «1 USD = N сом».
 * Если в проекте сохранён некорректный курс (≤1 при USD), используем fallback (НБКР).
 */
export function resolveProjectUsdRate(
	projectExchangeRate?: string | number | null,
	fallbackUsdRate = 0,
): number {
	const stored = parseFloat(String(projectExchangeRate || "0"));
	if (Number.isFinite(stored) && stored > 1) return stored;
	if (fallbackUsdRate > 1) return fallbackUsdRate;
	return Number.isFinite(stored) && stored > 0 ? stored : 1;
}

/** Сколько KGS в 1 USD для хранимых в проекте USD-сумм. */
function projectUsdToKgsRate(
	exchangeRate?: string | number | null,
	fallbackUsdRate = 0,
) {
	return resolveProjectUsdRate(exchangeRate, fallbackUsdRate);
}

/** Приводит сумму в валюте проекта к KGS. */
export function projectAmountToKgs(
	amount: number,
	fromCurrency = "KGS",
	projectExchangeRate?: string | number | null,
	fallbackUsdRate = 0,
) {
	if (!Number.isFinite(amount)) return 0;
	const from = fromCurrency || "KGS";
	if (from === "KGS") return amount;
	const rate = projectUsdToKgsRate(projectExchangeRate, fallbackUsdRate);
	return rate > 0 ? amount * rate : amount;
}

/** KGS → валюта проекта (для фактических расходов, хранимых в сомах). */
export function kgsToProjectCurrency(
	kgs: number,
	projectCurrency = "KGS",
	projectExchangeRate?: string | number | null,
	fallbackUsdRate = 0,
) {
	if (!Number.isFinite(kgs)) return 0;
	const currency = projectCurrency || "KGS";
	if (currency === "KGS") return kgs;
	const rate = projectUsdToKgsRate(projectExchangeRate, fallbackUsdRate);
	return rate > 0 ? kgs / rate : kgs;
}

/** KGS → валюта отображения (курс НБКР или ручной override). */
export function kgsToProjectDisplay(
	kgs: number,
	displayCurrency = "KGS",
	displayUsdRate = 1,
) {
	if (!Number.isFinite(kgs)) return 0;
	if (displayCurrency === "KGS") return kgs;
	const rate = displayUsdRate > 0 ? displayUsdRate : 1;
	return kgs / rate;
}

/**
 * Конвертация для переключателя Сом/USD на экране проектов.
 * displayUsdRate — «1 USD = N сом» (НБКР или ручной).
 */
export function convertProjectAmountForDisplay(
	amount: number,
	fromCurrency = "KGS",
	displayCurrency = "KGS",
	projectExchangeRate?: string | number | null,
	displayUsdRate = 1,
) {
	if (!Number.isFinite(amount)) return 0;
	const from = fromCurrency || "KGS";
	if (from === displayCurrency) return amount;
	const fallback = displayUsdRate > 0 ? displayUsdRate : 0;
	const kgs = projectAmountToKgs(amount, from, projectExchangeRate, fallback);
	return kgsToProjectDisplay(kgs, displayCurrency, displayUsdRate);
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
