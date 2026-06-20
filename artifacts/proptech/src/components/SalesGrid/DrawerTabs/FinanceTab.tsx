import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ListChecks } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { SalesGridUnit } from "../types";

function fmt(n: string | number | null | undefined) {
	if (!n) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(parseFloat(String(n)))} сом`;
}

export function FinanceTab({ unit }: { unit: SalesGridUnit }) {
	const c = unit.contract;
	const { data: accruals = [], isLoading } = useQuery<Array<{
		id: number;
		contractId: number;
		installmentNumber: number;
		dueDate: string;
		amount: string;
		paidAmount: string;
		remainingAmount: string;
		status: string;
		currency: string;
	}>>({
		queryKey: ["construction-accruals", c?.id],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
		enabled: !!c?.id,
		select: (rows) =>
			rows
				.filter((row) => row.contractId === c?.id)
				.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
	});
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
			<div className="flex flex-wrap gap-2">
				<Link href={`/construction/contracts-sales?highlight=${c.id}&status=${c.status || "all"}`}>
					<Button variant="outline" size="sm" className="gap-1.5">
						<ExternalLink className="h-3.5 w-3.5" />
						Открыть договор
					</Button>
				</Link>
				<Link href="/construction/accruals">
					<Button variant="outline" size="sm" className="gap-1.5">
						<ListChecks className="h-3.5 w-3.5" />
						Начисления
					</Button>
				</Link>
			</div>
			<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="text-[10px] font-bold uppercase text-slate-400">
						График платежей
					</p>
					{isLoading && <span className="text-xs text-slate-400">Загрузка…</span>}
				</div>
				{!isLoading && accruals.length === 0 ? (
					<p className="text-xs text-slate-500">
						График ещё не сформирован. Его можно создать в карточке договора.
					</p>
				) : (
					<ul className="space-y-2">
						{accruals.slice(0, 6).map((row) => {
							const paid = row.status === "paid";
							const remainingRow =
								parseFloat(row.remainingAmount || "0") ||
								Math.max(
									0,
									parseFloat(row.amount || "0") - parseFloat(row.paidAmount || "0"),
								);
							return (
								<li
									key={row.id}
									className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-2"
								>
									<div>
										<p className="font-medium">
											№{row.installmentNumber} · {row.dueDate}
										</p>
										<p className="text-xs text-slate-500">
											{paid ? "Погашен" : remainingRow > 0 ? "К оплате" : row.status}
										</p>
									</div>
									<div className="text-right font-mono text-xs">
										<p>{fmt(row.amount)}</p>
										<p className={paid ? "text-emerald-700" : "text-rose-700"}>
											остаток {fmt(remainingRow)}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				)}
				{accruals.length > 6 && (
					<p className="mt-2 text-xs text-slate-500">
						Показано 6 из {accruals.length}. Полный график в «Начислениях».
					</p>
				)}
			</div>
		</div>
	);
}
