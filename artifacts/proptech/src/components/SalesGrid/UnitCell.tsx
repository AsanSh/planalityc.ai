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
import { STATUS_BORDER_HEX, STATUS_HEX, STATUS_SURFACE_HEX } from "./types";
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
	const accent = STATUS_HEX[unit.status] || "#64748b";
	const surface = STATUS_SURFACE_HEX[unit.status] || "#f8fafc";
	const border = STATUS_BORDER_HEX[unit.status] || "#cbd5e1";
	const published = isUnitPublishedForSale(unit);
	const hasPrice = hasUnitSalePrice(unit);
	const locked = isSalesOnly && !published;
	const pps = resolvedPricePerSqm(unit);
	const total = resolvedTotalPrice(unit);
	const modified = !!unit.areaModified;
	const priceLabel = formatPricePerSqmCompact(pps);
	const priceToneClass = isSalesOnly
		? published
			? "bg-white/75 text-slate-700 ring-emerald-100"
			: "bg-slate-100/80 text-slate-500 ring-slate-200"
		: hasPrice
			? "bg-white/75 text-slate-700 ring-emerald-100"
			: "bg-amber-50/90 text-amber-700 ring-amber-200";

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
					"sales-unit-card group relative flex h-20 w-20 flex-col items-center justify-center overflow-hidden rounded-[18px] border text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)] transition-all duration-200 ease-out",
					locked
						? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
						: "cursor-pointer hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(15,23,42,0.65)] active:translate-y-0 active:scale-[0.98]",
					selected && "ring-2 ring-slate-950 ring-offset-2",
					bulkChecked && "ring-2 ring-emerald-500 ring-offset-2",
				)}
				style={
					locked
						? undefined
						: {
								borderColor: modified && cellViewMode === "pto" ? "#f59e0b" : border,
								background:
									modified && cellViewMode === "pto"
										? "linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)"
										: `linear-gradient(145deg, #ffffff 0%, ${surface} 100%)`,
							}
				}
			>
				<span
					className="pointer-events-none absolute left-2 top-2 h-2 w-2 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.72)] transition-transform duration-200 group-hover:scale-125"
					style={{ backgroundColor: locked ? "#94a3b8" : accent }}
				/>
				<span
					className="pointer-events-none absolute inset-x-3 bottom-0 h-px opacity-70"
					style={{
						background: locked
							? "#cbd5e1"
							: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
					}}
				/>
				{locked && (
					<Lock className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-gray-500 shadow" />
				)}
				{modified && cellViewMode !== "pto" && (
					<span className="absolute -top-1.5 -right-1.5 rounded bg-orange-500 px-0.5 text-[7px] font-bold text-white">
						Δ
					</span>
				)}
				<span
					className="text-[15px] font-black leading-none tracking-normal"
					style={{ color: locked ? "#64748b" : accent }}
				>
					{unit.unitNumber}
				</span>
				{cellViewMode === "pto" ? (
					<span className={cn("text-[9px] font-semibold", modified ? "text-amber-800" : "text-gray-700")}>
						{unit.area ? `${unit.area}м²` : "—"}
					</span>
				) : (
					<>
						<div className="mt-1 flex min-h-[12px] items-center gap-1 text-[8px] font-semibold text-slate-500">
							{unit.area && <span>{unit.area}м²</span>}
							{unit.roomCount != null && <span>{unit.roomCount}к</span>}
						</div>
						{(cellViewMode === "crm" || cellViewMode === "prices") && (
							<span
								className={cn(
									"mt-1 max-w-[66px] truncate rounded-full px-1.5 py-0.5 text-[7px] font-bold leading-none ring-1",
									priceToneClass,
								)}
							>
								{isSalesOnly
									? published
										? priceLabel
										: "закрыта"
									: hasPrice
										? priceLabel
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
