import type { KpiFilter, UnitsStats } from "./types";
import { KPI_LABELS, STATUS_HEX } from "./types";

const KPI_KEYS: Exclude<KpiFilter, "all">[] = [
	"free",
	"reserved",
	"sold",
	"settled",
	"building",
	"closed",
];

const KPI_STATUS: Record<Exclude<KpiFilter, "all">, string> = {
	free: "available",
	reserved: "reserved",
	sold: "sold",
	settled: "occupied",
	building: "construction",
	closed: "closed",
};

export function KpiRow({
	stats,
	active,
	onSelect,
}: {
	stats: UnitsStats | undefined;
	active: KpiFilter;
	onSelect: (f: KpiFilter) => void;
}) {
	const cards: { key: KpiFilter; label: string; count: number; color: string }[] = [
		{ key: "all", label: "Всего", count: stats?.total ?? 0, color: "#0f172a" },
		...KPI_KEYS.map((k) => ({
			key: k,
			label: KPI_LABELS[k],
			count: stats?.[k] ?? 0,
			color: STATUS_HEX[KPI_STATUS[k]] || "#94a3b8",
		})),
	];

	return (
		<div className="flex flex-wrap gap-2">
			{cards.map((c) => (
				<button
					key={c.key}
					type="button"
					onClick={() => onSelect(c.key)}
					className={`flex min-w-[120px] flex-1 flex-col rounded-xl border px-3 py-2 text-left transition-all sm:max-w-[160px] ${
						active === c.key
							? "border-slate-900 bg-slate-950 text-white shadow-md"
							: "border-slate-200 bg-white hover:border-slate-300"
					}`}
				>
					<span
						className={`text-[10px] font-bold uppercase tracking-wider ${
							active === c.key ? "text-slate-400" : "text-slate-500"
						}`}
					>
						{c.label}
					</span>
					<span className="mt-1 flex items-center gap-2">
						<span
							className="h-2.5 w-2.5 rounded-full shrink-0"
							style={{ backgroundColor: active === c.key ? c.color : c.color }}
						/>
						<span className="text-xl font-black tabular-nums">{c.count}</span>
					</span>
				</button>
			))}
		</div>
	);
}
