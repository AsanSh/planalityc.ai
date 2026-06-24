import { History, Pencil, Receipt, Ruler, Trash2, X, XCircle } from "lucide-react";
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
	onTerminateContract,
	onSaved,
	onDelete,
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
	onTerminateContract?: (contractId: number) => void;
	onSaved: () => void;
	onDelete?: () => void;
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

	const normalizedStatus = unit.status.toLowerCase();
	const contractStatus = unit.contract?.status?.toLowerCase();
	const hasActiveContract =
		!!unit.contract &&
		!["cancelled", "terminated", "closed"].includes(contractStatus || "");
	const isReserved =
		normalizedStatus === "reserved" ||
		contractStatus === "draft" ||
		contractStatus === "review";
	const isSold =
		["sold", "registered", "occupied"].includes(normalizedStatus) ||
		["signed", "completed"].includes(contractStatus || "");
	const canStartSale =
		!isPTO &&
		!isPricingMode &&
		isUnitPublishedForSale(unit) &&
		!!onRequestSale;
	const canSell = canStartSale && !isSold && (!hasActiveContract || isReserved);
	const canReserve = canStartSale && !hasActiveContract && !isSold;
	const canTerminate = hasActiveContract && !!onTerminateContract;

	const body = (
		<div className="bg-white">
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
			<div className="p-4">
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
				{tab === "docs" && <DocsTab unit={unit} onSaved={onSaved} />}
				{tab === "history" && <HistoryTab unit={unit} />}
			</div>
			<div className="border-t border-slate-100 p-3 flex flex-wrap gap-2">
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
				{!isPTO && !isPricingMode && onDelete && !isSold && !isReserved && !hasActiveContract && (
					<Button
						size="sm"
						variant="outline"
						className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
						onClick={onDelete}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Удалить
					</Button>
				)}
				{canSell && (
					<Button
						size="sm"
						className="bg-amber-500 hover:bg-orange-600"
						onClick={() => onRequestSale!("sold")}
					>
						Продать
					</Button>
				)}
				{canReserve && (
					<Button
						size="sm"
						variant="outline"
						className="border-amber-300 text-amber-800"
						onClick={() => onRequestSale!("reserved")}
					>
						Забронировать
					</Button>
				)}
				{canTerminate && (
					<>
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
							onClick={() => onTerminateContract!(unit.contract!.id)}
						>
							<XCircle className="h-3.5 w-3.5" />
							Расторгнуть
						</Button>
					</>
				)}
			</div>
		</div>
	);

	if (isMobile) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col bg-black/40">
				<div className="mt-auto max-h-[90vh] rounded-t-2xl bg-white shadow-xl overflow-y-auto">
					{body}
				</div>
			</div>
		);
	}

	return (
		<div className="w-[400px] shrink-0 rounded-xl border border-slate-200 shadow-sm overflow-y-auto sticky top-[52px] max-h-[calc(100vh-120px)]">
			{body}
		</div>
	);
}
