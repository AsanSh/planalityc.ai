import { History, Pencil, Receipt, Ruler, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { isUnitPublishedForSale } from "@/lib/unit-pricing";
import type { StatusBadgeCfg } from "@/lib/unit-statuses";
import { DocsTab } from "./DrawerTabs/DocsTab";
import { FinanceTab } from "./DrawerTabs/FinanceTab";
import { HistoryTab } from "./DrawerTabs/HistoryTab";
import { MainTab } from "./DrawerTabs/MainTab";
import { PricesTab } from "./DrawerTabs/PricesTab";
import type { DrawerTab, SalesGridProject, SalesGridUnit } from "./types";

const TABS: { id: DrawerTab; label: string }[] = [
	{ id: "main", label: "Основное" },
	{ id: "finance", label: "Финансы" },
	{ id: "prices", label: "Цены" },
	{ id: "docs", label: "Документы" },
	{ id: "history", label: "История" },
];

export function UnitDrawer({
	unit,
	project,
	open,
	statusBadgeMap,
	isPTO,
	isPricingMode,
	isSalesOnly,
	canEditPrices,
	canBulkFloor,
	onClose,
	onEdit,
	onEditArea,
	onConfigurePrice,
	onRequestSale,
	onSaved,
}: {
	unit: SalesGridUnit | null;
	project: SalesGridProject | undefined;
	open: boolean;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
	isPTO: boolean;
	isPricingMode: boolean;
	isSalesOnly: boolean;
	canEditPrices: boolean;
	canBulkFloor: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onEditArea?: () => void;
	onConfigurePrice?: () => void;
	onRequestSale?: (status: "reserved" | "sold") => void;
	onSaved: () => void;
}) {
	const isMobile = useIsMobile();
	const [tab, setTab] = useState<DrawerTab>("main");

	if (!open || !unit) return null;

	const visibleTabs = TABS.filter((t) => {
		if (isPTO) return ["main", "docs", "history"].includes(t.id);
		if (isSalesOnly) return ["main", "finance"].includes(t.id);
		if (!canEditPrices && t.id === "prices") return false;
		return true;
	});

	const canSale =
		!isPTO &&
		!isPricingMode &&
		isUnitPublishedForSale(unit) &&
		!!onRequestSale;

	const body = (
		<div className="flex h-full min-h-0 flex-col bg-white">
			<div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 shrink-0">
				<div className="flex gap-1 overflow-x-auto">
					{visibleTabs.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
								tab === t.id
									? "bg-slate-900 text-white"
									: "text-slate-600 hover:bg-slate-100"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>
				<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto p-4 min-h-0">
				{tab === "main" && <MainTab unit={unit} statusBadgeMap={statusBadgeMap} />}
				{tab === "finance" && <FinanceTab unit={unit} />}
				{tab === "prices" && (
					<PricesTab
						unit={unit}
						project={project}
						canEditPrices={canEditPrices}
						canBulkFloor={canBulkFloor}
						onSaved={onSaved}
					/>
				)}
				{tab === "docs" && <DocsTab unitId={unit.id} />}
				{tab === "history" && <HistoryTab unitId={unit.id} />}
			</div>
			<div className="shrink-0 border-t border-slate-100 p-3 flex flex-wrap gap-2">
				{isPTO && onEditArea && (
					<>
						<Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-orange-600" onClick={onEditArea}>
							<Ruler className="h-3.5 w-3.5" />
							Площадь
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5"
							onClick={() => setTab("history")}
						>
							<History className="h-3.5 w-3.5" />
							История
						</Button>
					</>
				)}
				{isPricingMode && onConfigurePrice && (
					<Button
						size="sm"
						className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
						onClick={onConfigurePrice}
					>
						<Receipt className="h-3.5 w-3.5" />
						Настроить цену
					</Button>
				)}
				{!isPTO && !isPricingMode && onEdit && (
					<Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
						<Pencil className="h-3.5 w-3.5" />
						Редактировать
					</Button>
				)}
				{canSale && (
					<>
						<Button
							size="sm"
							variant="outline"
							className="border-amber-300 text-amber-800"
							onClick={() => onRequestSale!("reserved")}
						>
							Бронь
						</Button>
						<Button
							size="sm"
							className="bg-amber-500 hover:bg-orange-600"
							onClick={() => onRequestSale!("sold")}
						>
							Продажа
						</Button>
					</>
				)}
			</div>
		</div>
	);

	if (isMobile) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col bg-black/40">
				<div className="mt-auto max-h-[90vh] rounded-t-2xl bg-white shadow-xl overflow-hidden flex flex-col">
					{body}
				</div>
			</div>
		);
	}

	return (
		<div className="w-[400px] shrink-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-[52px] max-h-[calc(100vh-120px)] flex flex-col">
			{body}
		</div>
	);
}
