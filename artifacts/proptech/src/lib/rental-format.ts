/**
 * Единые утилиты форматирования для модуля Аренды.
 * Используй эти функции вместо локальных дублей в каждом файле.
 */

/**
 * Форматирует денежную сумму.
 * @param amount  число или строка
 * @param currency  код валюты (KGS, USD, KZT, …). По умолчанию KGS.
 */
export function fmtMoney(amount: number | string | null | undefined, currency = "KGS"): string {
	const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
	if (isNaN(num)) return "—";
	const cur = (currency || "KGS").toUpperCase();
	try {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: cur,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(num);
	} catch {
		// Fallback для неизвестных кодов валют
		return `${new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)} ${cur}`;
	}
}

/**
 * Форматирует дату в локаль ru-RU.
 * Возвращает "—" если дата невалидна.
 */
export function fmtDate(date: string | Date | null | undefined): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("ru-RU");
}

/**
 * Форматирует дату и время.
 */
export function fmtDateTime(date: string | Date | null | undefined): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "—";
	return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}
