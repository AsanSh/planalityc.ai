import type { KpiFilter, UnitsAreaStats, UnitsStats } from "./types";
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
	areaStats,
	active,
	onSelect,
}: {
	stats: UnitsStats | undefined;
	areaStats?: UnitsAreaStats;
	active: KpiFilter;
	onSelect: (f: KpiFilter) => void;
}) {
	const fmtArea = (value: number | undefined) =>
		new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
			Math.max(0, value ?? 0),
		);

	const cards: { key: KpiFilter; label: string; count: number; area: number; color: string }[] = [
		{
			key: "all",
			label: "Всего",
			count: stats?.total ?? 0,
			area: areaStats?.all ?? 0,
			color: "#0f172a",
		},
		...KPI_KEYS.map((k) => ({
			key: k,
			label: KPI_LABELS[k],
			count: stats?.[k] ?? 0,
			area: areaStats?.[k] ?? 0,
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
					className={`flex min-w-[150px] flex-1 flex-col rounded-xl border px-3 py-2 text-left transition-all sm:max-w-[190px] ${
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
						<span className="min-w-0 font-mono text-lg font-semibold leading-none tabular-nums tracking-tight">
							{c.count}
							<span className="text-slate-400">{" / "}</span>
							<span className="text-[0.86em]">{fmtArea(c.area)} м²</span>
						</span>
					</span>
				</button>
			))}
		</div>
	);
}
