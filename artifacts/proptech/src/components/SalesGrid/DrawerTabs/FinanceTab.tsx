import type { SalesGridUnit } from "../types";

function fmt(n: string | number | null | undefined) {
	if (!n) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(parseFloat(String(n)))} сом`;
}

export function FinanceTab({ unit }: { unit: SalesGridUnit }) {
	const c = unit.contract;
	if (!c) {
		return (
			<p className="text-sm text-slate-500 py-8 text-center">
				Договор не оформлен
			</p>
		);
	}

	const remaining = parseFloat(c.remainingAmount || "0");

	return (
		<div className="space-y-4 text-sm">
			<div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
				<p className="text-[10px] font-bold uppercase text-emerald-800/70">Контрагент</p>
				<p className="font-semibold">{c.buyerName || "—"}</p>
				{c.buyerPhone && <p className="text-xs text-slate-600">{c.buyerPhone}</p>}
				{c.contractNumber && (
					<p className="text-xs font-mono mt-1">Договор № {c.contractNumber}</p>
				)}
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Сумма договора</p>
					<p className="font-mono font-bold tabular-nums">{fmt(c.totalAmount)}</p>
				</div>
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Оплачено</p>
					<p className="font-mono font-bold tabular-nums text-emerald-700">{fmt(c.paidAmount)}</p>
				</div>
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Остаток</p>
					<p className={`font-mono font-bold tabular-nums ${remaining > 0 ? "text-rose-700" : "text-slate-600"}`}>
						{fmt(c.remainingAmount)}
					</p>
				</div>
				{c.downPayment && (
					<div>
						<p className="text-[10px] font-bold uppercase text-slate-400">Первый взнос</p>
						<p className="font-mono font-bold tabular-nums">{fmt(c.downPayment)}</p>
					</div>
				)}
			</div>
			{c.contractDate && (
				<p className="text-xs text-slate-500">Дата: {c.contractDate}</p>
			)}
		</div>
	);
}
