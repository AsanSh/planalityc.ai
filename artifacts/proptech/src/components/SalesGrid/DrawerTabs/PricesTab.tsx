import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
	formatPricePerSqmCompact,
	formatPriceSom,
	hasUnitSalePrice,
	isUnitPublishedForSale,
	resolvedPricePerSqm,
	resolvedTotalPrice,
} from "@/lib/unit-pricing";
import type { SalesGridProject, SalesGridUnit } from "../types";

export function PricesTab({
	unit,
	project,
	canEditPrices,
	canBulkFloor,
	onSaved,
}: {
	unit: SalesGridUnit;
	project: SalesGridProject | undefined;
	canEditPrices: boolean;
	canBulkFloor: boolean;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [coef, setCoef] = useState(unit.priceCoefficient || unit.saleCoefficient || "1");
	const [floorCoef, setFloorCoef] = useState("");
	const [loading, setLoading] = useState(false);

	const pps = resolvedPricePerSqm(unit);
	const total = resolvedTotalPrice(unit);
	const published = isUnitPublishedForSale(unit);
	const hasPrice = hasUnitSalePrice(unit);

	const applyFloor = async () => {
		if (!project || unit.floor == null) return;
		const coefficient = parseFloat(floorCoef.replace(",", "."));
		if (!Number.isFinite(coefficient) || coefficient <= 0) {
			toast({ title: "Укажите коэффициент", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			await api.patch(`/construction/projects/${project.id}/units/bulk`, {
				filter: { floor: unit.floor },
				update: { coefficient, savePriceOnly: true },
			});
			toast({ title: `Коэффициент применён к этажу ${unit.floor}` });
			onSaved();
		} catch (e) {
			toast({ title: getApiErrorMessage(e), variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4 text-sm">
			<div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
				<p className="text-[10px] font-bold uppercase text-slate-400">Текущая цена</p>
				{hasPrice ? (
					<>
						<p className="text-xl font-black tabular-nums">{formatPriceSom(total)}</p>
						<p className="text-slate-600 tabular-nums">{formatPricePerSqmCompact(pps)}</p>
						<p className="text-xs text-slate-500">
							Коэффициент: ×{unit.priceCoefficient || unit.saleCoefficient || "1"}
							{published ? " · опубликована" : " · черновик"}
						</p>
					</>
				) : (
					<p className="text-amber-700 font-medium">Цена не установлена</p>
				)}
			</div>
			{project?.baseSalePricePerSqm && (
				<p className="text-xs text-slate-500">
					База проекта: {formatPricePerSqmCompact(parseFloat(project.baseSalePricePerSqm))}
				</p>
			)}
			{canBulkFloor && unit.floor != null && (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
					<p className="text-xs font-semibold text-emerald-800">
						Применить к этажу {unit.floor}
					</p>
					<div>
						<Label className="text-xs">Коэффициент</Label>
						<Input
							value={floorCoef}
							onChange={(e) => setFloorCoef(e.target.value)}
							placeholder={coef}
							className="mt-1 h-8"
						/>
					</div>
					<Button
						size="sm"
						className="w-full bg-emerald-600 hover:bg-emerald-700"
						disabled={loading}
						onClick={() => void applyFloor()}
					>
						Применить к этажу {unit.floor}
					</Button>
				</div>
			)}
			{!canEditPrices && (
				<p className="text-xs text-slate-500">
					Редактирование цен доступно коммерческому директору
				</p>
			)}
		</div>
	);
}
