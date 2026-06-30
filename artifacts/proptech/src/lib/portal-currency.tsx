import { createContext, useContext, useState, type ReactNode } from "react";

export type Ccy = "KGS" | "USD";

// Курс по умолчанию (1 USD = X KGS). Платформа поддерживает только две валюты.
const USD_KGS = 89.5;

type Ctx = {
	display: Ccy;
	setDisplay: (c: Ccy) => void;
	/** Конвертирует сумму из её исходной валюты в выбранную и форматирует. */
	fmt: (amount: number | string | null | undefined, native?: string) => string;
	/** Конвертация без форматирования. */
	conv: (amount: number, native?: string) => number;
};

const PortalCurrencyCtx = createContext<Ctx | null>(null);

function convert(amount: number, native: Ccy, display: Ccy): number {
	if (native === display) return amount;
	if (native === "USD" && display === "KGS") return amount * USD_KGS;
	if (native === "KGS" && display === "USD") return amount / USD_KGS;
	return amount;
}

export function PortalCurrencyProvider({ children }: { children: ReactNode }) {
	const [display, setDisplayState] = useState<Ccy>(() => {
		try {
			return (localStorage.getItem("portalDisplayCcy") as Ccy) || "KGS";
		} catch {
			return "KGS";
		}
	});
	const setDisplay = (c: Ccy) => {
		setDisplayState(c);
		try {
			localStorage.setItem("portalDisplayCcy", c);
		} catch {
			/* ignore */
		}
	};

	const conv = (amount: number, native = "KGS") =>
		convert(amount, native === "USD" ? "USD" : "KGS", display);

	const fmt = (amount: number | string | null | undefined, native = "KGS") => {
		const num = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
		const v = convert(Number.isFinite(num) ? (num as number) : 0, native === "USD" ? "USD" : "KGS", display);
		const rounded = Math.round(v).toLocaleString("ru-KG");
		return display === "USD" ? `${rounded} $` : `${rounded} сом`;
	};

	return (
		<PortalCurrencyCtx.Provider value={{ display, setDisplay, fmt, conv }}>
			{children}
		</PortalCurrencyCtx.Provider>
	);
}

export function usePortalCurrency(): Ctx {
	const ctx = useContext(PortalCurrencyCtx);
	if (ctx) return ctx;
	// Фолбэк, если провайдер не подключён
	return {
		display: "KGS",
		setDisplay: () => {},
		fmt: (a, native = "KGS") => {
			const num = typeof a === "string" ? parseFloat(a) : a ?? 0;
			return `${Math.round(Number.isFinite(num) ? (num as number) : 0).toLocaleString("ru-KG")} ${native}`;
		},
		conv: (a) => a,
	};
}

/** Переключатель «Сомы / Доллары». */
export function PortalCurrencyToggle() {
	const { display, setDisplay } = usePortalCurrency();
	return (
		<div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-medium">
			{(
				[
					["KGS", "Сомы"],
					["USD", "Доллары"],
				] as [Ccy, string][]
			).map(([c, label]) => (
				<button
					key={c}
					type="button"
					onClick={() => setDisplay(c)}
					className={
						display === c
							? "rounded-md bg-slate-900 px-3 py-1.5 text-white"
							: "rounded-md px-3 py-1.5 text-gray-500 hover:text-slate-900"
					}
				>
					{label}
				</button>
			))}
		</div>
	);
}
