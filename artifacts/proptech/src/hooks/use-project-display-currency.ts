import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
	nbkrUsdRateLabel,
	unitInKgs,
	type DisplayCurrency,
	type NbkrResponse,
} from "@/lib/nbkr-currency";

/** Курс «1 USD = N сом» для переключателя отображения (НБКР или ручной override в сессии). */
export function useProjectDisplayCurrency() {
	const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("KGS");
	const [manualUsdRate, setManualUsdRate] = useState<number | null>(null);

	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const nbkrUsdRate = useMemo(
		() => unitInKgs("USD", nbkr?.rates || {}) || 0,
		[nbkr?.rates],
	);

	const displayUsdRate = manualUsdRate ?? (nbkrUsdRate > 0 ? nbkrUsdRate : 1);

	const rateLabel = useMemo(() => {
		const formatted = new Intl.NumberFormat("ru-KG", {
			maximumFractionDigits: 4,
		}).format(displayUsdRate);
		const suffix = manualUsdRate != null ? " (вручную)" : "";
		return `1 USD = ${formatted} сом${suffix}`;
	}, [displayUsdRate, manualUsdRate]);

	const nbkrRateLabel = nbkr?.rates ? nbkrUsdRateLabel(nbkr.rates) : null;

	const setManualRateFromInput = (raw: string) => {
		const normalized = raw.replace(/\s/g, "").replace(",", ".");
		if (!normalized.trim()) {
			setManualUsdRate(null);
			return;
		}
		const n = parseFloat(normalized);
		if (Number.isFinite(n) && n > 0) setManualUsdRate(n);
	};

	return {
		displayCurrency,
		setDisplayCurrency,
		displayUsdRate,
		manualUsdRate,
		setManualUsdRate,
		setManualRateFromInput,
		resetManualRate: () => setManualUsdRate(null),
		isManualRate: manualUsdRate != null,
		rateLabel,
		nbkrRateLabel,
		nbkrDate: nbkr?.date,
	};
}
