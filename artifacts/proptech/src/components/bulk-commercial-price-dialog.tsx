import { useEffect, useMemo, useState } from "react";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { parseNum } from "@/lib/unit-pricing";

export interface BulkCommercialPriceProject {
	id: number;
	baseSalePricePerSqm?: string | null;
	costPerSqm?: string | null;
	currency?: string;
}

type BulkPricingResponse = {
	updated: number;
	skipped: number;
	total: number;
	errors?: { unitId: number; unitNumber?: string; error: string }[];
};

function fmtMoney(v: number) {
	if (!Number.isFinite(v) || v <= 0) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(v);
}

function currencyLabel(currency?: string) {
	return currency === "USD" ? "USD" : "сом";
}

export function BulkCommercialPriceDialog({
	open,
	onClose,
	onSaved,
	project,
	projectId,
	unitIds,
	floorLabel,
}: {
	open: boolean;
	onClose: () => void;
	onSaved: () => void;
	project: BulkCommercialPriceProject | null;
	projectId: number;
	unitIds: number[];
	floorLabel?: string | null;
}) {
	const { toast } = useToast();
	const [basePrice, setBasePrice] = useState("");
	const [coefficient, setCoefficient] = useState("1");
	const [approvePrice, setApprovePrice] = useState(true);
	const [publishForSale, setPublishForSale] = useState(true);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !project) return;
		const base = project.baseSalePricePerSqm || project.costPerSqm || "";
		setBasePrice(base ? String(base) : "");
		setCoefficient("1");
		setApprovePrice(true);
		setPublishForSale(true);
	}, [open, project]);

	const count = unitIds.length;
	const base = parseNum(basePrice);
	const coef = parseNum(coefficient) || 1;
	const approvedPerSqm = base > 0 ? base * coef : 0;
	const moneyUnit = currencyLabel(project?.currency);

	const scopeLabel = useMemo(() => {
		if (floorLabel) return `этаж ${floorLabel}`;
		if (count === 1) return "1 объект";
		return `${count} объектов`;
	}, [floorLabel, count]);

	const handleSave = async () => {
		if (count === 0) {
			toast({ title: "Нет выбранных объектов", variant: "destructive" });
			return;
		}
		if (base <= 0) {
			toast({ title: "Укажите цену за м²", variant: "destructive" });
			return;
		}
		if (coef <= 0) {
			toast({ title: "Коэффициент должен быть больше нуля", variant: "destructive" });
			return;
		}
		if (publishForSale && !(await confirmDialog(`Открыть ${count} объект(ов) для продажи?`))) {
			return;
		}

		setLoading(true);
		try {
			const { data } = await api.post<BulkPricingResponse>(
				"/construction/units/bulk-pricing",
				{
					projectId,
					unitIds,
					baseSalePricePerSqm: base,
					priceCoefficient: coef,
					currency: project?.currency || "KGS",
					approvePrice: approvePrice || publishForSale,
					publishForSale,
					savePriceOnly: approvePrice && !publishForSale,
				},
			);
			const skippedNote =
				data.skipped > 0 ? `, пропущено ${data.skipped}` : "";
			toast({
				title: `Обновлено ${data.updated} из ${data.total}${skippedNote}`,
				description:
					data.errors?.length
						? data.errors
								.slice(0, 3)
								.map((e) => `${e.unitNumber || e.unitId}: ${e.error}`)
								.join("; ")
						: undefined,
				variant: data.updated > 0 ? "default" : "destructive",
			});
			onSaved();
			onClose();
		} catch (err: unknown) {
			toast({
				title: getApiErrorMessage(err, "Не удалось применить цены"),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Массовая цена · {scopeLabel}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-slate-600">
						Будет применено к <span className="font-semibold">{count}</span>{" "}
						{count === 1 ? "объекту" : "объектам"}
						{floorLabel ? ` на ${floorLabel}` : ""}.
					</p>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<Label className="text-xs">Цена закрытия за м²</Label>
							<Input
								type="number"
								min="0"
								step="1"
								className="mt-1"
								value={basePrice}
								onChange={(e) => setBasePrice(e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="text-xs">Коэффициент</Label>
							<Input
								type="number"
								min="0.01"
								step="0.01"
								className="mt-1"
								value={coefficient}
								onChange={(e) => setCoefficient(e.target.value)}
							/>
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
						<div className="flex justify-between gap-2">
							<span className="text-slate-600">Утверждённая цена за м²</span>
							<span className="font-semibold tabular-nums">
								{approvedPerSqm > 0
									? `${fmtMoney(approvedPerSqm)} ${moneyUnit}`
									: `— ${moneyUnit}`}
							</span>
						</div>
					</div>

					<label className="flex items-start gap-2 cursor-pointer">
						<Checkbox
							checked={approvePrice}
							onCheckedChange={(v) => setApprovePrice(v === true)}
						/>
						<span className="text-sm leading-snug">Утвердить цену</span>
					</label>

					<label className="flex items-start gap-2 cursor-pointer">
						<Checkbox
							checked={publishForSale}
							onCheckedChange={(v) => setPublishForSale(v === true)}
						/>
						<span className="text-sm leading-snug">
							Открыть для продажи (видно менеджерам)
						</span>
					</label>

					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button type="button" onClick={handleSave} disabled={loading || count === 0}>
							{loading ? "..." : "Применить"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
