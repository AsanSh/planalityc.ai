import { fmtCurrencyAmount, type DisplayCurrency } from "@/lib/nbkr-currency";

export function rentalDisplayCurrency(currency?: string | null): DisplayCurrency {
	return (currency || "KGS").toUpperCase() === "USD" ? "USD" : "KGS";
}

export function fmtRentalCurrency(
	amount: number | string,
	currency?: string | null,
) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	if (Number.isNaN(num)) return "—";
	return fmtCurrencyAmount(num, rentalDisplayCurrency(currency));
}

export function pickDefaultRentalAccountId(
	accounts: { id: number; currency?: string | null }[],
	contractCurrency: string,
): string {
	const target = contractCurrency.toUpperCase();
	const match = accounts.find(
		(a) => (a.currency || "KGS").toUpperCase() === target,
	);
	if (match) return String(match.id);
	return accounts[0] ? String(accounts[0].id) : "";
}

/** Сумма платежа в валюте договора при оплате сомами (1 USD = kgsPerUsd сом). */
export function paymentToContractAmount(
	paymentAmount: number,
	paymentCurrency: string,
	contractCurrency: string,
	kgsPerUsd: number,
): number {
	const payCur = paymentCurrency.toUpperCase();
	const contractCur = contractCurrency.toUpperCase();
	if (payCur === contractCur || paymentAmount <= 0) return paymentAmount;
	if (payCur === "KGS" && contractCur === "USD" && kgsPerUsd > 0) {
		return Math.round((paymentAmount / kgsPerUsd) * 100) / 100;
	}
	if (payCur === "USD" && contractCur === "KGS" && kgsPerUsd > 0) {
		return Math.round(paymentAmount * kgsPerUsd * 100) / 100;
	}
	return paymentAmount;
}
