import { AlertTriangle, CheckCircle2, Clock3, Percent, WalletCards } from "lucide-react";
import { MatrixTableFrame } from "@/components/matrix-table-frame";
import { parseNum, resolvedPricePerSqm, resolvedTotalPrice } from "@/lib/unit-pricing";
import { gridCfgFor, type StatusGridCfg } from "@/lib/unit-statuses";
import { cn } from "@/lib/utils";
import type { SalesGridUnit } from "./types";
import { STATUS_HEX } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const STACK_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];

function money(n: number, currency = "KGS") {
	if (!Number.isFinite(n) || n <= 0) return "—";
	const suffix = currency === "USD" ? "$" : currency === "KGS" ? "сом" : currency;
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n)} ${suffix}`;
}

function paymentTotal(unit: SalesGridUnit) {
	const contractTotal = parseNum(unit.contract?.totalAmount);
	if (contractTotal > 0) return contractTotal;
	return resolvedTotalPrice(unit);
}

function paidAmount(unit: SalesGridUnit) {
	return parseNum(unit.contract?.paidAmount);
}

function paymentPercent(unit: SalesGridUnit) {
	const total = paymentTotal(unit);
	if (total <= 0) return 0;
	return Math.max(0, Math.min(100, Math.round((paidAmount(unit) / total) * 100)));
}

function movementDate(unit: SalesGridUnit) {
	return (
		unit.lastActivityAt ||
		unit.statusChangedAt ||
		unit.updatedAt ||
		unit.contract?.contractDate ||
		unit.createdAt ||
		null
	);
}

function daysWithoutMovement(unit: SalesGridUnit) {
	const raw = movementDate(unit);
	if (!raw) return null;
	const time = new Date(raw).getTime();
	if (!Number.isFinite(time)) return null;
	const days = Math.floor((Date.now() - time) / DAY_MS);
	return days > 0 ? days : 0;
}

function priceDeviation(unit: SalesGridUnit) {
	const base = parseNum(unit.basePricePerSqm || unit.pricePerSqm || unit.listPrice);
	const approved = resolvedPricePerSqm(unit);
	if (base <= 0 || approved <= 0) return 0;
	return Math.round(((approved - base) / base) * 100);
}

function deviationStyle(deviation: number) {
	if (deviation <= -5) return { color: "#ef4444", label: `${deviation}%` };
	if (deviation < 0) return { color: "#f59e0b", label: `${deviation}%` };
	if (deviation >= 5) return { color: "#10b981", label: `+${deviation}%` };
	return { color: "#dbeafe", label: "" };
}

function payColor(percent: number) {
	if (percent >= 90) return "#16a34a";
	if (percent >= 35) return "#0891b2";
	if (percent > 0) return "#f59e0b";
	return "#cbd5e1";
}

function FinancialUnitCell({
	unit,
	statusGridMap,
	selected,
	onOpen,
}: {
	unit: SalesGridUnit;
	statusGridMap: Record<string, StatusGridCfg>;
	selected?: boolean;
	onOpen: () => void;
}) {
	const cfg = gridCfgFor(statusGridMap, unit.status);
	const statusColor = STATUS_HEX[unit.status] || "#94a3b8";
	const percent = paymentPercent(unit);
	const paid = paidAmount(unit);
	const total = paymentTotal(unit);
	const days = daysWithoutMovement(unit);
	const deviation = priceDeviation(unit);
	const dev = deviationStyle(deviation);
	const isStalled = days != null && days > 21 && percent < 100;
	const area = parseNum(unit.area);

	return (
		<button
			type="button"
			onClick={onOpen}
			className={cn(
				"group relative h-[74px] w-[138px] overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md",
				selected && "ring-2 ring-slate-950 ring-offset-2",
			)}
			style={{ borderLeftColor: dev.color, borderLeftWidth: 5 }}
			title={`${unit.unitNumber}: ${cfg.label}, оплачено ${percent}%`}
		>
			<span className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: statusColor }} />
			{isStalled && (
				<span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
					{days}д
				</span>
			)}
			<div className="flex h-full flex-col justify-between px-3 pb-2 pt-3">
				<div>
					<div className="flex items-start justify-between gap-2">
						<span className="font-mono text-[19px] font-black leading-none text-slate-950">
							{unit.unitNumber}
						</span>
						<span className="shrink-0 text-xs font-bold text-slate-500">
							{area > 0 ? `${area} м²` : "—"}
						</span>
					</div>
					<div className="mt-0.5 flex items-center justify-between gap-2">
						<span className="text-[11px] font-semibold text-slate-500">оплата {percent}%</span>
						{dev.label && (
							<span className="text-[10px] font-black" style={{ color: dev.color }}>
								{dev.label}
							</span>
						)}
					</div>
				</div>
				<div>
					<div className="h-2 overflow-hidden rounded-full bg-slate-200">
						<div
							className="h-full rounded-full transition-all"
							style={{ width: `${percent}%`, backgroundColor: payColor(percent) }}
						/>
					</div>
					<div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-400">
						<span>{paid > 0 ? money(paid, unit.contract?.currency || unit.currency) : "0"}</span>
						<span>{total > 0 ? money(total, unit.contract?.currency || unit.currency) : "нет цены"}</span>
					</div>
				</div>
			</div>
		</button>
	);
}

function FinancialSummary({ units }: { units: SalesGridUnit[] }) {
	const displayCurrency =
		units.find((u) => u.contract?.currency || u.currency)?.contract?.currency ||
		units.find((u) => u.currency)?.currency ||
		"KGS";
	const summary = units.reduce(
		(acc, unit) => {
			const total = parseNum(unit.contract?.totalAmount);
			const paid = paidAmount(unit);
			const percent = paymentPercent(unit);
			const days = daysWithoutMovement(unit);
			const deviation = priceDeviation(unit);
			acc.contracted += total;
			acc.paid += paid;
			if (percent >= 100) acc.fullyPaid += 1;
			if (days != null && days > 21 && percent < 100) acc.stalled += 1;
			if (deviation < 0) acc.discounted += 1;
			return acc;
		},
		{ contracted: 0, paid: 0, fullyPaid: 0, stalled: 0, discounted: 0 },
	);
	const gap = Math.max(0, summary.contracted - summary.paid);
	const receivedPct =
		summary.contracted > 0 ? Math.round((summary.paid / summary.contracted) * 100) : 0;

	return (
		<aside className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:w-[360px]">
			<div className="flex items-center gap-2">
				<WalletCards className="h-5 w-5 text-cyan-700" />
				<h3 className="text-lg font-black uppercase tracking-wide text-slate-950">
					Деньги, а не статусы
				</h3>
			</div>
			<div className="mt-5 space-y-4">
				<div className="flex items-center justify-between text-sm text-slate-600">
					<span>Законтрактовано</span>
					<strong className="font-mono text-lg text-slate-950">
						{money(summary.contracted, displayCurrency)}
					</strong>
				</div>
				<div className="flex items-center justify-between text-sm text-slate-600">
					<span>Реально получено</span>
					<strong className="font-mono text-lg text-emerald-600">
						{money(summary.paid, displayCurrency)}
					</strong>
				</div>
				<div className="h-3 overflow-hidden rounded-full bg-slate-200">
					<div className="h-full rounded-full bg-emerald-500" style={{ width: `${receivedPct}%` }} />
				</div>
				<div className="rounded-xl bg-white p-3 text-sm font-bold text-rose-600">
					Кассовый разрыв: {money(gap, displayCurrency)} ещё не на счетах
				</div>
			</div>

			<div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
				<div className="flex items-center justify-between py-3 text-sm">
					<span className="flex items-center gap-2 text-slate-600">
						<Percent className="h-4 w-4" /> Лотов с дисконтом
					</span>
					<strong className="text-lg text-slate-950">{summary.discounted}</strong>
				</div>
				<div className="flex items-center justify-between py-3 text-sm">
					<span className="flex items-center gap-2 text-slate-600">
						<Clock3 className="h-4 w-4" /> Зависших &gt;21 дня
					</span>
					<strong className="text-lg text-rose-500">{summary.stalled}</strong>
				</div>
				<div className="flex items-center justify-between py-3 text-sm">
					<span className="flex items-center gap-2 text-slate-600">
						<CheckCircle2 className="h-4 w-4" /> Полностью оплачено
					</span>
					<strong className="text-lg text-emerald-600">{summary.fullyPaid}</strong>
				</div>
			</div>

			<div className="mt-5">
				<h4 className="text-sm font-black text-slate-950">Что кодирует ячейка</h4>
				<div className="mt-3 space-y-2 text-sm text-slate-600">
					<div className="flex items-center gap-2">
						<span className="h-3 w-3 rounded bg-emerald-500" /> Статус сверху
					</div>
					<div className="flex items-center gap-2">
						<span className="h-3 w-3 rounded bg-cyan-600" /> Оплата снизу
					</div>
					<div className="flex items-center gap-2">
						<span className="h-3 w-3 rounded bg-rose-500" /> Скидка / минус маржа слева
					</div>
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-rose-500" /> Без движения больше 21 дня
					</div>
				</div>
			</div>
		</aside>
	);
}

export function FinancialLayerView({
	units,
	statusGridMap,
	panelUnitId,
	onOpenUnit,
}: {
	units: SalesGridUnit[];
	statusGridMap: Record<string, StatusGridCfg>;
	panelUnitId: number | null;
	onOpenUnit: (u: SalesGridUnit) => void;
}) {
	const floors = Array.from(new Set(units.map((u) => u.floor ?? 0))).sort((a, b) => b - a);
	const rows = floors.map((floor) =>
		units
			.filter((u) => (u.floor ?? 0) === floor)
			.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })),
	);
	const maxCols = Math.max(1, ...rows.map((row) => row.length));

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
			<MatrixTableFrame className="overflow-x-auto">
				<table className="border-separate border-spacing-x-2 border-spacing-y-2">
					<thead>
						<tr>
							<th className="w-12" />
							{Array.from({ length: maxCols }).map((_, index) => (
								<th key={index} className="px-1 pb-1 text-center text-sm font-black text-slate-500">
									Стояк {STACK_NAMES[index] ?? index + 1}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{floors.map((floor, rowIndex) => (
							<tr key={floor}>
								<td className="sticky left-0 z-10 bg-white pr-2 text-right text-sm font-bold text-slate-500">
									{floor} эт.
								</td>
								{Array.from({ length: maxCols }).map((_, colIndex) => {
									const unit = rows[rowIndex]?.[colIndex];
									if (!unit) return <td key={colIndex} className="h-[74px] w-[138px]" />;
									return (
										<td key={unit.id} className="align-top">
											<FinancialUnitCell
												unit={unit}
												statusGridMap={statusGridMap}
												selected={panelUnitId === unit.id}
												onOpen={() => onOpenUnit(unit)}
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</MatrixTableFrame>
			<FinancialSummary units={units} />
		</div>
	);
}
