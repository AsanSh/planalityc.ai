import { Badge } from "@/components/ui/badge";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";
import type { SalesGridUnit } from "../types";
import { UNIT_TYPES } from "../types";

const fmtArea = (v: string | null | undefined) => {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 2 }).format(parseFloat(v));
};

export function MainTab({
	unit,
	statusBadgeMap,
}: {
	unit: SalesGridUnit;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
}) {
	const cfg = badgeCfgFor(statusBadgeMap, unit.status);
	const typeLabel = UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || unit.unitType;

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
					{cfg.label}
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
			{unit.notes?.trim() && (
				<div>
					<p className="text-[10px] font-bold uppercase text-slate-400">Заметки</p>
					<p className="text-slate-700 whitespace-pre-wrap">{unit.notes}</p>
				</div>
			)}
		</div>
	);
}
