import type { KpiFilter, UnitsStats } from "./types";
import { KPI_LABELS, STATUS_BORDER_HEX, STATUS_HEX, STATUS_SURFACE_HEX } from "./types";

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
	const cards: {
		key: KpiFilter;
		label: string;
		count: number;
		color: string;
		surface: string;
		border: string;
	}[] = [
		{
			key: "all",
			label: "Всего",
			count: stats?.total ?? 0,
			color: "#0f172a",
			surface: "#f8fafc",
			border: "#cbd5e1",
		},
		...KPI_KEYS.map((k) => ({
			key: k,
			label: KPI_LABELS[k],
			count: stats?.[k] ?? 0,
			color: STATUS_HEX[KPI_STATUS[k]] || "#64748b",
			surface: STATUS_SURFACE_HEX[KPI_STATUS[k]] || "#f8fafc",
			border: STATUS_BORDER_HEX[KPI_STATUS[k]] || "#cbd5e1",
		})),
	];

	return (
		<div className="flex flex-wrap gap-2.5">
			{cards.map((c, index) => (
				<button
					key={c.key}
					type="button"
					onClick={() => onSelect(c.key)}
					className={`sales-kpi-card group relative flex min-w-[120px] flex-1 overflow-hidden rounded-[16px] border px-3 py-2.5 text-left transition-all duration-200 ease-out sm:max-w-[160px] ${
						active === c.key
							? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_34px_-24px_rgba(15,23,42,0.85)]"
							: "bg-white text-slate-950 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.55)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-26px_rgba(15,23,42,0.72)]"
					}`}
					style={{
						animationDelay: `${index * 45}ms`,
						borderColor: active === c.key ? "#020617" : c.border,
						background:
							active === c.key
								? "linear-gradient(145deg, #020617 0%, #0f172a 100%)"
								: `linear-gradient(145deg, #ffffff 0%, ${c.surface} 100%)`,
					}}
				>
					<span
						className="pointer-events-none absolute -right-6 -top-8 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-55"
						style={{ backgroundColor: c.color }}
					/>
					<span
						className={`relative text-[10px] font-bold uppercase tracking-wider ${
							active === c.key ? "text-slate-400" : "text-slate-500"
						}`}
					>
						{c.label}
					</span>
					<span className="relative mt-1 flex items-center gap-2">
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.65)] transition-transform duration-200 group-hover:scale-125"
							style={{ backgroundColor: c.color }}
						/>
						<span className="text-[23px] font-black leading-none tabular-nums tracking-normal">
							{c.count}
						</span>
					</span>
					<span
						className="absolute inset-x-3 bottom-0 h-0.5 origin-left scale-x-75 rounded-full opacity-70 transition-transform duration-300 group-hover:scale-x-100"
						style={{ backgroundColor: c.color }}
					/>
				</button>
			))}
		</div>
	);
}
