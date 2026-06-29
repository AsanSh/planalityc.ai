import { useQuery } from "@tanstack/react-query";
import { History, Pencil, Receipt, Ruler } from "lucide-react";
import { useState } from "react";
import type { UnitContract } from "@/components/chess-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import {
	formatPricePerSqmCompact,
	formatPriceSom,
	hasUnitSalePrice,
	isUnitPublishedForSale,
	resolvedPricePerSqm,
	resolvedTotalPrice,
} from "@/lib/unit-pricing";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";

const UNIT_TYPE_LABELS: Record<string, string> = {
	apartment: "Квартира",
	studio: "Студия",
	office: "Офис",
	commercial: "Коммерческое",
	parking: "Паркинг",
	storage: "Кладовая",
};

export type ChessPanelMode = "crm" | "pto" | "pricing" | "sales";

export type ChessPanelUnit = {
	id: number;
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	unitType: string;
	roomCount?: number | null;
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	basePricePerSqm?: string | null;
	saleCoefficient?: string | null;
	priceCoefficient?: string | null;
	approvedSalePricePerSqm?: string | null;
	approvedTotalPrice?: string | null;
	isPublishedForSale?: boolean | null;
	priceApproved?: boolean;
	currency: string;
	status: string;
	notes?: string | null;
	areaModified?: boolean;
	originalArea?: string | null;
	areaDelta?: string | null;
	contract?: UnitContract | null;
};

type SupplementRow = {
	id: number;
	oldArea: string;
	newArea: string;
	pricePerSqm: string;
	balanceDelta: string;
	currency: string;
	status: string;
	createdAt: string;
};

function unitCoefficient(unit: Pick<ChessPanelUnit, "priceCoefficient" | "saleCoefficient">) {
	return unit.priceCoefficient || unit.saleCoefficient || "1";
}

function fmtArea(v: string | number | null | undefined) {
	if (!v) return "—";
	const n = parseFloat(String(v));
	if (!Number.isFinite(n)) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 2 }).format(n);
}

function fmtNum(v: string | number | null | undefined) {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		parseFloat(String(v)),
	);
}

function AreaHistoryDialog({
	unitId,
	unitNumber,
	open,
	onClose,
}: {
	unitId: number;
	unitNumber: string;
	open: boolean;
	onClose: () => void;
}) {
	const { data: rows = [], isLoading } = useQuery<SupplementRow[]>({
		queryKey: ["construction-unit-supplements", unitId],
		queryFn: () =>
			api.get(`/construction/units/${unitId}/supplements`).then((r) => r.data),
		enabled: open && unitId > 0,
	});

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>История площадей · кв. {unitNumber}</DialogTitle>
				</DialogHeader>
				{isLoading ? (
					<p className="text-sm text-muted-foreground py-4 text-center">Загрузка...</p>
				) : rows.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center">
						Изменений площади пока нет
					</p>
				) : (
					<ul className="space-y-2 max-h-[320px] overflow-y-auto">
						{rows.map((row) => (
							<li
								key={row.id}
								className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
							>
								<div className="flex justify-between gap-2">
									<span className="font-medium tabular-nums">
										{fmtArea(row.oldArea)} → {fmtArea(row.newArea)} м²
									</span>
									<Badge variant="outline" className="text-[10px] shrink-0">
										{row.status === "signed"
											? "Подписано"
											: row.status === "cancelled"
												? "Отменено"
												: "Черновик"}
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground mt-1 tabular-nums">
									Δ баланс: {fmtNum(row.balanceDelta)} {row.currency === "KGS" ? "сом" : row.currency}
								</p>
								<p className="text-[10px] text-muted-foreground mt-0.5">
									{new Date(row.createdAt).toLocaleString("ru-KG")}
								</p>
							</li>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}

function PanelBody({
	unit,
	mode,
	statusBadgeMap,
	onClose,
	onEdit,
	onEditArea,
	onConfigurePrice,
	onRequestSale,
	canRequestSale,
}: {
	unit: ChessPanelUnit;
	mode: ChessPanelMode;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
	onClose: () => void;
	onEdit?: () => void;
	onEditArea?: () => void;
	onConfigurePrice?: () => void;
	onRequestSale?: (status: "reserved" | "sold") => void;
	canRequestSale?: boolean;
}) {
	const [showHistory, setShowHistory] = useState(false);
	const statusCfg = badgeCfgFor(statusBadgeMap, unit.status);
	const hasPrice = hasUnitSalePrice(unit);
	const pps = resolvedPricePerSqm(unit);
	const total = resolvedTotalPrice(unit);
	const coeff = unitCoefficient(unit);
	const area = parseFloat(unit.area || "0");
	const published = isUnitPublishedForSale(unit);

	const floorLine = [
		unit.floor ? `${unit.floor} этаж` : null,
		unit.block ? `Секция ${unit.block}` : null,
	]
		.filter(Boolean)
		.join(" · ");

	const priceFormula =
		hasPrice && area > 0
			? `${fmtArea(unit.area)} м² × ${fmtNum(pps)} × ${coeff}`
			: null;

	return (
		<>
			<div className="bg-white rounded-xl">
				{/* Dark header */}
				<div className="rounded-t-xl bg-slate-950 px-4 py-4 text-white shrink-0">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="text-2xl font-black tracking-tight">{unit.unitNumber}</p>
							{floorLine && (
								<p className="text-xs text-slate-400 mt-0.5">{floorLine}</p>
							)}
						</div>
						<Badge
							variant="outline"
							className={`${statusCfg.color} border-white/20 shrink-0`}
						>
							{statusCfg.label}
						</Badge>
					</div>
				</div>

				{/* White body */}
				<div className="bg-white px-4 py-4 space-y-4">
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Тип
							</p>
							<p className="font-medium mt-0.5">
								{UNIT_TYPE_LABELS[unit.unitType] || unit.unitType}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Комнат
							</p>
							<p className="font-medium mt-0.5 tabular-nums">
								{unit.roomCount ?? "—"}
							</p>
						</div>
					</div>

					<div>
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Площадь
						</p>
						<p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
							{unit.area ? `${fmtArea(unit.area)} м²` : "—"}
						</p>
						{unit.areaModified && unit.originalArea && (
							<p className="text-xs text-amber-700 mt-0.5">
								Было: {fmtArea(unit.originalArea)} м²
								{unit.areaDelta ? ` (Δ ${unit.areaDelta})` : ""}
							</p>
						)}
					</div>

					{(mode === "crm" || mode === "sales" || mode === "pricing") && (
						<div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Итоговая цена
							</p>
							{hasPrice ? (
								<>
									<p className="text-xl font-black text-slate-900 tabular-nums">
										{formatPriceSom(total)}
									</p>
									<p className="text-sm text-slate-600 tabular-nums">
										{formatPricePerSqmCompact(pps)}
									</p>
									{priceFormula && (
										<p className="text-xs text-slate-500 font-mono tabular-nums">
											{priceFormula}
										</p>
									)}
									{mode === "pricing" && (
										<p className="text-xs text-slate-500">
											Коэффициент: ×{coeff}
											{published ? " · опубликована" : " · не опубликована"}
										</p>
									)}
									{mode === "sales" && !published && (
										<p className="text-xs text-amber-700 font-medium">
											Не открыта для продажи
										</p>
									)}
								</>
							) : (
								<p className="text-sm text-amber-700 font-medium">
									Цена не установлена
								</p>
							)}
						</div>
					)}

					{unit.contract && (
						<div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-1">
							<p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
								Контрагент
							</p>
							{unit.contract.buyerName && (
								<p className="font-semibold text-sm">{unit.contract.buyerName}</p>
							)}
							{unit.contract.contractNumber && (
								<p className="text-xs text-slate-600 font-mono">
									№ {unit.contract.contractNumber}
								</p>
							)}
							{unit.contract.totalAmount && (
								<p className="text-xs text-slate-600 tabular-nums mt-1">
									Договор: {fmtNum(unit.contract.totalAmount)} сом
									{unit.contract.paidAmount
										? ` · оплачено ${fmtNum(unit.contract.paidAmount)}`
										: ""}
								</p>
							)}
						</div>
					)}

					{unit.notes?.trim() && (
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Заметки
							</p>
							<p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">
								{unit.notes}
							</p>
						</div>
					)}
				</div>

				{/* Footer actions */}
				<div className="border-t border-slate-100 bg-white px-4 py-3 flex flex-wrap gap-2 rounded-b-xl">
					<Button variant="outline" size="sm" onClick={onClose}>
						Закрыть
					</Button>

					{mode === "pto" && (
						<>
							<Button
								size="sm"
								className="bg-am-brand hover:bg-am-brand-hover gap-1.5"
								onClick={onEditArea}
							>
								<Ruler className="w-3.5 h-3.5" />
								Изменить площадь
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => setShowHistory(true)}
							>
								<History className="w-3.5 h-3.5" />
								История площадей
							</Button>
						</>
					)}

					{mode === "pricing" && onConfigurePrice && (
						<Button
							size="sm"
							className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
							onClick={onConfigurePrice}
						>
							<Receipt className="w-3.5 h-3.5" />
							Настроить цену
						</Button>
					)}

					{(mode === "crm" || mode === "sales") && onEdit && (
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={onEdit}
						>
							<Pencil className="w-3.5 h-3.5" />
							{mode === "sales" ? "Карточка" : "Редактировать"}
						</Button>
					)}

					{canRequestSale && onRequestSale && (
						<>
							<Button
								size="sm"
								className="bg-am-brand hover:bg-am-brand-hover"
								onClick={() => onRequestSale("sold")}
							>
								Продать
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="border-amber-300 text-amber-800"
								onClick={() => onRequestSale("reserved")}
							>
								Забронировать
							</Button>
						</>
					)}
				</div>
			</div>

			<AreaHistoryDialog
				unitId={unit.id}
				unitNumber={unit.unitNumber}
				open={showHistory}
				onClose={() => setShowHistory(false)}
			/>
		</>
	);
}

export type ChessUnitDetailPanelProps = {
	unit: ChessPanelUnit | null;
	mode: ChessPanelMode;
	statusBadgeMap: Record<string, StatusBadgeCfg>;
	open: boolean;
	onClose: () => void;
	onEdit?: () => void;
	onEditArea?: () => void;
	onConfigurePrice?: () => void;
	onRequestSale?: (status: "reserved" | "sold") => void;
	canRequestSale?: boolean;
	/** inline — колонка справа на desktop; sheet — drawer на mobile */
	presentation?: "inline" | "sheet";
};

export function ChessUnitDetailPanel({
	unit,
	mode,
	statusBadgeMap,
	open,
	onClose,
	onEdit,
	onEditArea,
	onConfigurePrice,
	onRequestSale,
	canRequestSale,
	presentation = "inline",
}: ChessUnitDetailPanelProps) {
	const isMobile = useIsMobile();

	if (!unit || !open) return null;
	if (presentation === "inline" && isMobile) return null;
	if (presentation === "sheet" && !isMobile) return null;

	const body = (
		<PanelBody
			unit={unit}
			mode={mode}
			statusBadgeMap={statusBadgeMap}
			onClose={onClose}
			onEdit={onEdit}
			onEditArea={onEditArea}
			onConfigurePrice={onConfigurePrice}
			onRequestSale={onRequestSale}
			canRequestSale={canRequestSale}
		/>
	);

	if (presentation === "sheet") {
		return (
			<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
				<SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
					<SheetHeader className="sr-only">
						<SheetTitle>Квартира {unit.unitNumber}</SheetTitle>
					</SheetHeader>
					{body}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div className="flex flex-col min-h-0 h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white sticky top-4 max-h-[calc(100vh-248px)]">
			{body}
		</div>
	);
}
