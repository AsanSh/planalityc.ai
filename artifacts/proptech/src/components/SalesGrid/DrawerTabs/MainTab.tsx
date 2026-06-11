import { Badge } from "@/components/ui/badge";
import { formatPricePerSqmCompact, resolvedPricePerSqm } from "@/lib/unit-pricing";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";
import type { SalesGridUnit } from "../types";
import { UNIT_TYPES } from "../types";

const fmtArea = (v: string | null | undefined) => {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 2 }).format(parseFloat(v));
};

const FALLBACK_STATUS_LABELS: Record<string, string> = {
	available: "Свободна",
	reserved: "Бронь",
	sold: "Продана",
	registered: "Продана",
	occupied: "Заселена",
	construction: "Строится",
	closed: "Закрыта",
	draft: "Черновик",
	unavailable: "Недоступна",
};

export function MainTab({
	unit,
	statusBadgeMap,
}: {
	unit: SalesGridUnit;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
}) {
	const cfg = badgeCfgFor(statusBadgeMap, unit.status);
	const statusLabel = cfg.label === "—"
		? FALLBACK_STATUS_LABELS[unit.status] || unit.status || "—"
		: cfg.label;
	const typeLabel = UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || unit.unitType;
	const pricePerSqm = resolvedPricePerSqm(unit);
	const details = [
		{ label: "Номер", value: unit.unitNumber },
		{ label: "Этаж", value: unit.floor ?? "—" },
		{ label: "Секция / блок", value: unit.block || "—" },
		{ label: "Тип", value: typeLabel },
		{ label: "Комнат", value: unit.roomCount ?? "—" },
		{ label: "Площадь", value: `${fmtArea(unit.area)} м²` },
		{ label: "Цена за м²", value: formatPricePerSqmCompact(pricePerSqm) },
		{ label: "Статус", value: statusLabel },
	];

	return (
		<div className="space-y-4 text-sm">
			<div className="flex items-center justify-between gap-2">
				<div>
					<p className="text-2xl font-black">{unit.unitNumber}</p>
					<p className="text-xs text-slate-500 mt-0.5">
						{unit.floor != null ? `${unit.floor} этаж` : ""}
						{unit.block ? ` · секция ${unit.block}` : ""}
					</p>
				</div>
				<Badge variant="outline" className={cfg.color}>
					{statusLabel}
				</Badge>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Тип</p>
					<p className="font-medium">{typeLabel}</p>
				</div>
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Комнат</p>
					<p className="font-medium tabular-nums">{unit.roomCount ?? "—"}</p>
				</div>
			</div>
			<div>
				<p className="text-[10px] font-bold uppercase text-slate-400">Площадь</p>
				<p className="text-xl font-black tabular-nums">{fmtArea(unit.area)} м²</p>
				{unit.areaModified && unit.originalArea && (
					<p className="text-xs text-amber-700 mt-0.5">
						Было: {fmtArea(unit.originalArea)} м²
					</p>
				)}
			</div>
			<div className="rounded-[18px] border border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-cyan-50/40 p-3 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.72)]">
				<div className="mb-3 flex items-center justify-between gap-2">
					<div>
						<p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
							Паспорт квартиры
						</p>
					</div>
					<span className="rounded-full border border-white bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
						{unit.block || "—"}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{details.map((item) => (
						<div
							key={item.label}
							className="min-h-[62px] rounded-2xl border border-white/80 bg-white/78 p-2.5 shadow-sm"
						>
							<p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
								{item.label}
							</p>
							<p className="mt-1 truncate text-[15px] font-black leading-tight text-slate-950 tabular-nums">
								{item.value}
							</p>
						</div>
					))}
				</div>
				{unit.notes?.trim() ? (
					<div className="mt-2 rounded-2xl border border-white/80 bg-white/78 p-2.5 shadow-sm">
						<p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
							Заметки
						</p>
						<p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-snug text-slate-700">
							{unit.notes}
						</p>
					</div>
				) : (
					<div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white/55 p-2.5">
						<p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
							Заметки
						</p>
						<p className="mt-1 text-sm font-semibold text-slate-400">—</p>
					</div>
				)}
			</div>
		</div>
	);
}
