import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
	convertViaKgs,
	fmtCurrencyAmount,
	nbkrUsdRateLabel,
	type NbkrResponse,
	unitInKgs,
} from "@/lib/nbkr-currency";
import { resolveProjectUsdRate } from "@/lib/project-currency";
import {
	fmtRentalCurrency,
	paymentToContractAmount,
	rentalDisplayCurrency,
} from "@/lib/rental-currency";

type Props = {
	paymentAmount: number;
	paymentCurrency: string;
	accountCurrency: string;
	contractCurrency?: string;
	paymentDate: string;
	exchangeRate?: string;
	onExchangeRateChange?: (rate: string) => void;
};

export function RentalPaymentFxNote({
	paymentAmount,
	paymentCurrency,
	accountCurrency,
	contractCurrency,
	paymentDate,
	exchangeRate,
	onExchangeRateChange,
}: Props) {
	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates", paymentDate],
		queryFn: () =>
			api
				.get("/nbkr/rates", { params: { date: paymentDate } })
				.then((r) => r.data),
		staleTime: 60 * 60 * 1000,
		enabled: paymentAmount > 0 && !!paymentDate,
	});

	const payCur = paymentCurrency || "KGS";
	const accCur = accountCurrency || "KGS";
	const contractCur = contractCurrency || payCur;
	const rates = nbkr?.rates ?? {};
	const nbkrUsdRate = rates.USD ? unitInKgs("USD", rates) : 0;
	const needsContractFx =
		payCur !== contractCur && paymentAmount > 0;
	const effectiveKgsPerUsd = resolveProjectUsdRate(
		exchangeRate,
		nbkrUsdRate,
	);

	useEffect(() => {
		if (!needsContractFx || !onExchangeRateChange || exchangeRate) return;
		if (nbkrUsdRate <= 0) return;
		onExchangeRateChange(String(resolveProjectUsdRate(undefined, nbkrUsdRate)));
	}, [needsContractFx, nbkrUsdRate, exchangeRate, onExchangeRateChange]);

	if (paymentAmount <= 0) return null;

	const contractEquivalent = needsContractFx
		? paymentToContractAmount(
				paymentAmount,
				payCur,
				contractCur,
				effectiveKgsPerUsd,
			)
		: paymentAmount;

	let accountCredit: number | null = null;
	try {
		if (payCur === accCur) {
			accountCredit = paymentAmount;
		} else if (payCur === "KGS" && accCur === "USD") {
			accountCredit =
				effectiveKgsPerUsd > 0
					? paymentAmount / effectiveKgsPerUsd
					: null;
		} else if (payCur === "USD" && accCur === "KGS") {
			accountCredit =
				effectiveKgsPerUsd > 0
					? paymentAmount * effectiveKgsPerUsd
					: null;
		} else {
			accountCredit = convertViaKgs(paymentAmount, payCur, accCur, rates);
		}
	} catch {
		accountCredit = null;
	}

	const usdLabel = nbkrUsdRateLabel(rates);

	return (
		<div className="text-xs rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-2">
			<p className="text-blue-900">
				<span className="text-blue-700">Платёж:</span>{" "}
				<strong>
					{fmtCurrencyAmount(
						paymentAmount,
						rentalDisplayCurrency(payCur),
					)}
				</strong>
				{" · "}
				<span className="text-blue-700">Договор:</span>{" "}
				<strong>{contractCur}</strong>
				{" · "}
				<span className="text-blue-700">Счёт:</span>{" "}
				<strong>{accCur}</strong>
			</p>

			{needsContractFx && onExchangeRateChange ? (
				<div className="space-y-1">
					<Label className="text-blue-800 text-xs">
						Курс (1 USD = сом) — НБКР, можно изменить
					</Label>
					<Input
						type="number"
						min="1"
						step="0.01"
						className="h-8 text-xs bg-white"
						value={exchangeRate ?? ""}
						onChange={(e) => onExchangeRateChange(e.target.value)}
						placeholder={
							nbkrUsdRate > 0 ? String(nbkrUsdRate.toFixed(2)) : "87.50"
						}
					/>
					<p className="text-blue-800">
						По договору:{" "}
						<strong>
							{fmtRentalCurrency(contractEquivalent, contractCur)}
						</strong>
					</p>
				</div>
			) : null}

			{payCur === accCur ? (
				<p className="text-blue-800">
					На счёт зачислится{" "}
					<strong>
						{fmtCurrencyAmount(
							paymentAmount,
							rentalDisplayCurrency(payCur),
						)}
					</strong>
					.
				</p>
			) : accountCredit != null ? (
				<p className="text-blue-800">
					На счёт зачислится{" "}
					<strong>
						{fmtCurrencyAmount(
							accountCredit,
							rentalDisplayCurrency(accCur),
						)}
					</strong>
					{nbkr?.date ? (
						<span className="text-blue-600">
							{" "}
							(курс НБКР на {nbkr.date}
							{usdLabel ? `, ${usdLabel}` : ""})
						</span>
					) : null}
				</p>
			) : (
				<p className="text-amber-700">Не удалось рассчитать курс НБКР</p>
			)}
			{nbkr?.warning ? (
				<p className="text-amber-700">{nbkr.warning}</p>
			) : null}
		</div>
	);
}
