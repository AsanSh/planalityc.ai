import { Lock } from "lucide-react";
import { useRef, useState } from "react";
import {
	formatPricePerSqmCompact,
	formatPriceSom,
	hasUnitSalePrice,
	isUnitPublishedForSale,
	resolvedPricePerSqm,
	resolvedTotalPrice,
} from "@/lib/unit-pricing";
import { gridCfgFor, type StatusGridCfg } from "@/lib/unit-statuses";
import { cn } from "@/lib/utils";
import type { CellViewMode, SalesGridUnit } from "./types";
import { STATUS_HEX } from "./types";
import { UnitTooltip } from "./UnitTooltip";

function unitCoef(u: SalesGridUnit) {
	return u.priceCoefficient || u.saleCoefficient || "1";
}

const DOUBLE_TAP_MS = 300;

function useBulkTapSelection(onBulkToggle?: () => void) {
	const lastTapAt = useRef(0);
	const suppressClickUntil = useRef(0);

	const handleTouchEnd = () => {
		if (!onBulkToggle) return;
		const now = Date.now();
		if (now - lastTapAt.current < DOUBLE_TAP_MS) {
			lastTapAt.current = 0;
			suppressClickUntil.current = now + DOUBLE_TAP_MS;
			onBulkToggle();
			return;
		}
		lastTapAt.current = now;
	};

	const shouldSuppressClick = () => Date.now() < suppressClickUntil.current;

	return { handleTouchEnd, shouldSuppressClick };
}

export function UnitCell({
	unit,
	statusGridMap,
	cellViewMode,
	isSalesOnly,
	selected,
	bulkChecked,
	showBulkCheckbox,
	onBulkToggle,
	onOpen,
}: {
	unit: SalesGridUnit;
	statusGridMap: Record<string, StatusGridCfg>;
	cellViewMode: CellViewMode;
	isSalesOnly: boolean;
	selected?: boolean;
	bulkChecked?: boolean;
	showBulkCheckbox?: boolean;
	onBulkToggle?: () => void;
	onOpen: () => void;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const [hover, setHover] = useState(false);
	const { handleTouchEnd, shouldSuppressClick } = useBulkTapSelection(
		showBulkCheckbox ? onBulkToggle : undefined,
	);
	const cfg = gridCfgFor(statusGridMap, unit.status);
	const hex = STATUS_HEX[unit.status] || "#94a3b8";
	const published = isUnitPublishedForSale(unit);
	const hasPrice = hasUnitSalePrice(unit);
	const locked = isSalesOnly && !published;
	const pps = resolvedPricePerSqm(unit);
	const total = resolvedTotalPrice(unit);
	const modified = !!unit.areaModified;

	const lines: string[] = [unit.unitNumber];
	if (unit.area) lines.push(`${unit.area} м²`);
	if (cellViewMode === "pto") {
		lines.push(cfg.label);
	} else if (cellViewMode === "prices") {
		if (hasPrice) {
			lines.push(`${formatPriceSom(pps)}/м²`);
			lines.push(`Итого: ${formatPriceSom(total)}`);
			lines.push(`Коэффициент: ×${unitCoef(unit)}`);
		} else lines.push("Цена не установлена");
		lines.push(cfg.label);
	} else {
		if (isSalesOnly) {
			if (published) {
				lines.push(`${formatPriceSom(pps)}/м²`);
				lines.push(`Итого: ${formatPriceSom(total)}`);
			} else lines.push("Не открыта для продажи");
		} else if (hasPrice) {
			lines.push(`${formatPriceSom(pps)}/м²`);
			lines.push(`Итого: ${formatPriceSom(total)}`);
		} else lines.push("Цена не установлена");
		lines.push(cfg.label);
	}

	const anchor = hover && ref.current ? ref.current.getBoundingClientRect() : null;

	return (
		<>
			<button
				ref={ref}
				type="button"
				disabled={locked}
				title={showBulkCheckbox && !locked ? "ПКМ — выбрать · двойной тап" : undefined}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				onFocus={() => setHover(true)}
				onBlur={() => setHover(false)}
				onContextMenu={(e) => {
					if (!showBulkCheckbox || !onBulkToggle || locked) return;
					e.preventDefault();
					onBulkToggle();
				}}
				onTouchEnd={() => {
					if (!showBulkCheckbox || locked) return;
					handleTouchEnd();
				}}
				onClick={() => {
					if (shouldSuppressClick()) return;
					onOpen();
				}}
				className={cn(
					"relative flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 text-center shadow-sm transition-all",
					locked ? "cursor-not-allowed opacity-60 bg-gray-100 border-gray-200" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
					selected && "ring-2 ring-slate-900 ring-offset-2",
					bulkChecked && "ring-2 ring-emerald-600 ring-offset-1",
					!locked && !modified && cellViewMode !== "pto" && "bg-white",
				)}
				style={
					locked
						? undefined
						: {
								borderColor: modified && cellViewMode === "pto" ? "#f59e0b" : hex,
								backgroundColor:
									modified && cellViewMode === "pto"
										? "#fef3c7"
										: `${hex}18`,
							}
				}
			>
				{locked && (
					<Lock className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-gray-500 shadow" />
				)}
				{modified && cellViewMode !== "pto" && (
					<span className="absolute -top-1.5 -right-1.5 rounded bg-orange-500 px-0.5 text-[7px] font-bold text-white">
						Δ
					</span>
				)}
				<span className="text-sm font-black" style={{ color: locked ? "#6b7280" : hex }}>
					{unit.unitNumber}
				</span>
				{cellViewMode === "pto" ? (
					<span className={cn("text-[9px] font-semibold", modified ? "text-amber-800" : "text-gray-700")}>
						{unit.area ? `${unit.area}м²` : "—"}
					</span>
				) : (
					<>
						{unit.area && (
							<span className="text-[8px] opacity-70" style={{ color: locked ? "#6b7280" : hex }}>
								{unit.area}м²
							</span>
						)}
						{unit.roomCount != null && (
							<span className="text-[8px] opacity-70" style={{ color: locked ? "#6b7280" : hex }}>
								{unit.roomCount}к
							</span>
						)}
						{(cellViewMode === "crm" || cellViewMode === "prices") && (
							<span
								className={cn(
									"text-[7px] font-medium mt-0.5",
									isSalesOnly
										? published
											? "text-emerald-700"
											: "text-gray-500"
										: hasPrice
											? "text-emerald-700"
											: "text-amber-700",
								)}
							>
								{isSalesOnly
									? published
										? formatPricePerSqmCompact(pps)
										: "закрыта"
									: hasPrice
										? formatPricePerSqmCompact(pps)
										: "нет цены"}
							</span>
						)}
					</>
				)}
			</button>
			<UnitTooltip anchor={anchor} lines={lines} visible={hover && !locked} />
		</>
	);
}
