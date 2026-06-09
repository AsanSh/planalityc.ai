import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatPriceSom } from "@/lib/unit-pricing";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";
import type { SalesGridUnit } from "./types";

type AgentGroup = {
	key: string;
	buyerName: string;
	buyerPhone: string | null;
	contractNumber: string | null;
	units: SalesGridUnit[];
	totalAmount: number;
	paidAmount: number;
};

export function AgentsView({
	units,
	statusBadgeMap,
	onSelectUnit,
}: {
	units: SalesGridUnit[];
	statusBadgeMap: Record<string, StatusBadgeCfg>;
	onSelectUnit: (u: SalesGridUnit) => void;
}) {
	const groups = useMemo(() => {
		const map = new Map<string, AgentGroup>();
		for (const u of units) {
			const c = u.contract;
			if (!c?.buyerName) continue;
			const key = `${c.buyerName}|${c.contractNumber || ""}`;
			const existing = map.get(key);
			const total = parseFloat(c.totalAmount || "0");
			const paid = parseFloat(c.paidAmount || "0");
			if (existing) {
				existing.units.push(u);
				existing.totalAmount += total;
				existing.paidAmount += paid;
			} else {
				map.set(key, {
					key,
					buyerName: c.buyerName,
					buyerPhone: c.buyerPhone,
					contractNumber: c.contractNumber,
					units: [u],
					totalAmount: total,
					paidAmount: paid,
				});
			}
		}
		return [...map.values()].sort((a, b) => a.buyerName.localeCompare(b.buyerName, "ru"));
	}, [units]);

	if (groups.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
				Нет контрагентов с договорами по выбранным фильтрам
			</div>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{groups.map((g) => (
				<div
					key={g.key}
					className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
				>
					<div className="flex items-start justify-between gap-2">
						<div>
							<p className="font-semibold text-slate-900">{g.buyerName}</p>
							{g.buyerPhone && (
								<p className="text-xs text-slate-500 mt-0.5">{g.buyerPhone}</p>
							)}
							{g.contractNumber && (
								<p className="text-xs font-mono text-slate-600 mt-1">№ {g.contractNumber}</p>
							)}
						</div>
						<Badge variant="outline" className="shrink-0">
							{g.units.length} кв.
						</Badge>
					</div>
					<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
						<div>
							<p className="text-slate-400 uppercase tracking-wide text-[10px]">Договор</p>
							<p className="font-mono font-semibold tabular-nums">
								{formatPriceSom(g.totalAmount)}
							</p>
						</div>
						<div>
							<p className="text-slate-400 uppercase tracking-wide text-[10px]">Оплачено</p>
							<p className="font-mono font-semibold tabular-nums text-emerald-700">
								{formatPriceSom(g.paidAmount)}
							</p>
						</div>
					</div>
					<div className="mt-3 flex flex-wrap gap-1.5">
						{g.units.map((u) => {
							const cfg = badgeCfgFor(statusBadgeMap, u.status);
							return (
								<button
									key={u.id}
									type="button"
									onClick={() => onSelectUnit(u)}
									className={`rounded-lg border px-2 py-1 text-xs font-medium ${cfg.color}`}
								>
									{u.unitNumber}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
