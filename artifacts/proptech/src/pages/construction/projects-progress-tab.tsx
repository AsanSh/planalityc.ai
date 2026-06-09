import { useQuery } from "@tanstack/react-query";
import {
	Banknote,
	Building2,
	ChevronDown,
	Download,
	Landmark,
	Layers,
	Plus,
	Search,
	Settings2,
	Trash2,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CurrencyToggle } from "@/components/currency-toggle";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import {
	loadProgressColumnConfig,
	newCustomColumnId,
	saveProgressColumnConfig,
	type ProgressColumnConfig,
	type ProgressCustomColumn,
	type ProgressGroupId,
} from "@/lib/progress-projects-column-config";
import {
	nbkrUsdRateLabel,
	unitInKgs,
	type DisplayCurrency,
	type NbkrRate,
	type NbkrResponse,
} from "@/lib/nbkr-currency";
import { cn } from "@/lib/utils";

const PROGRESS_CURRENCY_KEY = "progress-currency";

type ProjectMeta = {
	id: number;
	currency?: string | null;
	exchangeRate?: string | null;
};

function loadProgressCurrency(): DisplayCurrency {
	try {
		const v = localStorage.getItem(PROGRESS_CURRENCY_KEY);
		return v === "USD" ? "USD" : "KGS";
	} catch {
		return "KGS";
	}
}

function saveProgressCurrency(v: DisplayCurrency) {
	localStorage.setItem(PROGRESS_CURRENCY_KEY, v);
}

export type ProgressSummaryRow = {
	projectId: number;
	projectName: string;
	isTotal?: boolean;
	totalSaleableArea: number;
	nonSaleableArea: number;
	soldArea: number;
	unsoldArea: number;
	avgSalePricePerSqm: number;
	contracted: number;
	collected: number;
	collectionsRemainder: number;
	futureSales: number;
	totalRevenue: number;
	grossProfit: number;
	marginPerSqm: number;
	overdueDebt: number;
	pdPercent: number;
	approvedCostPerSqm: number;
	actualCostPerSqm: number;
	currentCostPerSqm: number;
	constructionCosts: number;
	landCosts: number;
	documentationCosts: number;
	otherCosts: number;
	requiredAmount: number;
	projectBudget: number;
	totalSpent: number;
	[key: string]: string | number | boolean | undefined;
};

const COLUMN_GROUPS: { id: ProgressGroupId; label: string }[] = [
	{ id: "projectData", label: "Данные по проекту" },
	{ id: "collections", label: "Сборы" },
	{ id: "profitability", label: "Прибыльность" },
	{ id: "cost", label: "Себестоимость" },
	{ id: "expenses", label: "Затраты" },
	{ id: "custom", label: "Дополнительно" },
];

type BuiltinColumn = {
	id: string;
	groupId: ProgressGroupId;
	defaultLabel: string;
	kind: "text" | "area" | "money" | "moneyPerSqm" | "percent";
	accessor: (row: ProgressSummaryRow) => number | string;
};

const BUILTIN_COLUMNS: BuiltinColumn[] = [
	{
		id: "projectName",
		groupId: "projectData",
		defaultLabel: "Проект",
		kind: "text",
		accessor: (r) => r.projectName,
	},
	{
		id: "totalSaleableArea",
		groupId: "projectData",
		defaultLabel: "Общая продажная площадь",
		kind: "area",
		accessor: (r) => r.totalSaleableArea,
	},
	{
		id: "nonSaleableArea",
		groupId: "projectData",
		defaultLabel: "Не продаваемая площадь",
		kind: "area",
		accessor: (r) => r.nonSaleableArea,
	},
	{
		id: "soldArea",
		groupId: "projectData",
		defaultLabel: "Проданная площадь",
		kind: "area",
		accessor: (r) => r.soldArea,
	},
	{
		id: "unsoldArea",
		groupId: "projectData",
		defaultLabel: "Остаток непроданной площади",
		kind: "area",
		accessor: (r) => r.unsoldArea,
	},
	{
		id: "avgSalePricePerSqm",
		groupId: "projectData",
		defaultLabel: "Средняя стоимость продажи 1м²",
		kind: "moneyPerSqm",
		accessor: (r) => r.avgSalePricePerSqm,
	},
	{
		id: "contracted",
		groupId: "collections",
		defaultLabel: "Законтрактовано",
		kind: "money",
		accessor: (r) => r.contracted,
	},
	{
		id: "collected",
		groupId: "collections",
		defaultLabel: "Собрано",
		kind: "money",
		accessor: (r) => r.collected,
	},
	{
		id: "collectionsRemainder",
		groupId: "collections",
		defaultLabel: "Остаток",
		kind: "money",
		accessor: (r) => r.collectionsRemainder,
	},
	{
		id: "futureSales",
		groupId: "collections",
		defaultLabel: "Будущие продажи",
		kind: "money",
		accessor: (r) => r.futureSales,
	},
	{
		id: "totalRevenue",
		groupId: "collections",
		defaultLabel: "Итого выручка",
		kind: "money",
		accessor: (r) => r.totalRevenue,
	},
	{
		id: "grossProfit",
		groupId: "profitability",
		defaultLabel: "Валовая прибыль",
		kind: "money",
		accessor: (r) => r.grossProfit,
	},
	{
		id: "marginPerSqm",
		groupId: "profitability",
		defaultLabel: "Маржа за 1м²",
		kind: "moneyPerSqm",
		accessor: (r) => r.marginPerSqm,
	},
	{
		id: "overdueDebt",
		groupId: "profitability",
		defaultLabel: "Просроченная задолженность",
		kind: "money",
		accessor: (r) => r.overdueDebt,
	},
	{
		id: "pdPercent",
		groupId: "profitability",
		defaultLabel: "PD%",
		kind: "percent",
		accessor: (r) => r.pdPercent,
	},
	{
		id: "approvedCostPerSqm",
		groupId: "cost",
		defaultLabel: "Утвержденная",
		kind: "moneyPerSqm",
		accessor: (r) => r.approvedCostPerSqm,
	},
	{
		id: "actualCostPerSqm",
		groupId: "cost",
		defaultLabel: "Фактическая",
		kind: "moneyPerSqm",
		accessor: (r) => r.actualCostPerSqm,
	},
	{
		id: "currentCostPerSqm",
		groupId: "cost",
		defaultLabel: "Текущая",
		kind: "moneyPerSqm",
		accessor: (r) => r.currentCostPerSqm,
	},
	{
		id: "constructionCosts",
		groupId: "expenses",
		defaultLabel: "Строительство",
		kind: "money",
		accessor: (r) => r.constructionCosts,
	},
	{
		id: "landCosts",
		groupId: "expenses",
		defaultLabel: "Земля",
		kind: "money",
		accessor: (r) => r.landCosts,
	},
	{
		id: "documentationCosts",
		groupId: "expenses",
		defaultLabel: "Документация",
		kind: "money",
		accessor: (r) => r.documentationCosts,
	},
	{
		id: "otherCosts",
		groupId: "expenses",
		defaultLabel: "Другие расходы",
		kind: "money",
		accessor: (r) => r.otherCosts,
	},
	{
		id: "requiredAmount",
		groupId: "expenses",
		defaultLabel: "Необходимая сумма",
		kind: "money",
		accessor: (r) => r.requiredAmount,
	},
	{
		id: "projectBudget",
		groupId: "expenses",
		defaultLabel: "Бюджет проекта",
		kind: "money",
		accessor: (r) => r.projectBudget,
	},
];

const fmtArea = (v: number) =>
	v > 0
		? `${v.toLocaleString("ru-KG", { maximumFractionDigits: 2 })} м²`
		: "—";

const fmtPercent = (v: number) =>
	v > 0
		? `${v.toLocaleString("ru-KG", { maximumFractionDigits: 1 })}%`
		: "—";

type ProgressFormatters = {
	fmtMoney: (kgs: number, projectId?: number) => string;
	fmtMoneyPerSqm: (kgs: number, projectId?: number) => string;
	formatCell: (
		kind: BuiltinColumn["kind"],
		value: number | string,
		projectId?: number,
	) => string;
};

function createProgressFormatters(
	displayCurrency: DisplayCurrency,
	rates: Record<string, NbkrRate>,
	projectMetaById: Record<number, ProjectMeta>,
): ProgressFormatters {
	const usdRateGlobal = unitInKgs("USD", rates) || 1;

	const kgsToDisplayAmount = (kgs: number, projectId?: number) => {
		if (displayCurrency === "KGS") return kgs;
		const meta = projectId != null ? projectMetaById[projectId] : undefined;
		const projectRate =
			meta?.currency && meta.currency !== "KGS"
				? parseFloat(meta.exchangeRate || "0") || 0
				: 0;
		if (projectRate > 0) return kgs / projectRate;
		return kgs / usdRateGlobal;
	};

	const fmtMoney = (kgs: number, projectId?: number) => {
		if (Math.abs(kgs) <= 0) return "—";
		const amount = kgsToDisplayAmount(kgs, projectId);
		if (displayCurrency === "USD") {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
				maximumFractionDigits: 0,
			}).format(amount);
		}
		return `${amount.toLocaleString("ru-KG", { maximumFractionDigits: 0 })} сом`;
	};

	const fmtMoneyPerSqm = (kgs: number, projectId?: number) => {
		if (kgs <= 0) return "—";
		const amount = kgsToDisplayAmount(kgs, projectId);
		if (displayCurrency === "USD") {
			const formatted = new Intl.NumberFormat("en-US", {
				maximumFractionDigits: 0,
			}).format(amount);
			return `$${formatted}/м²`;
		}
		return `${amount.toLocaleString("ru-KG", { maximumFractionDigits: 0 })} сом/м²`;
	};

	const formatCell = (
		kind: BuiltinColumn["kind"],
		value: number | string,
		projectId?: number,
	) => {
		if (kind === "text") return String(value || "—");
		const n = typeof value === "number" ? value : parseFloat(String(value));
		if (Number.isNaN(n)) return "—";
		if (kind === "area") return fmtArea(n);
		if (kind === "money") return fmtMoney(n, projectId);
		if (kind === "moneyPerSqm") return fmtMoneyPerSqm(n, projectId);
		if (kind === "percent") return fmtPercent(n);
		return String(value);
	};

	return { fmtMoney, fmtMoneyPerSqm, formatCell };
}

function moneyTone(value: number): "green" | "red" | "blue" | "yellow" {
	if (value > 0) return "green";
	if (value < 0) return "red";
	return "blue";
}

function sumRows(rows: ProgressSummaryRow[], pick: (r: ProgressSummaryRow) => number): number {
	return rows.reduce((s, r) => s + (pick(r) || 0), 0);
}

function buildTotalsRow(rows: ProgressSummaryRow[]): ProgressSummaryRow {
	const soldArea = sumRows(rows, (r) => r.soldArea);
	const soldRevenue = rows.reduce(
		(s, r) => s + (r.soldArea > 0 ? r.avgSalePricePerSqm * r.soldArea : 0),
		0,
	);
	const totalConstruction = sumRows(rows, (r) => r.totalSaleableArea + r.nonSaleableArea);
	const totalSpent = sumRows(rows, (r) => r.totalSpent);
	return {
		projectId: 0,
		projectName: "ИТОГО",
		isTotal: true,
		totalSaleableArea: sumRows(rows, (r) => r.totalSaleableArea),
		nonSaleableArea: sumRows(rows, (r) => r.nonSaleableArea),
		soldArea,
		unsoldArea: sumRows(rows, (r) => r.unsoldArea),
		avgSalePricePerSqm: soldArea > 0 ? soldRevenue / soldArea : 0,
		contracted: sumRows(rows, (r) => r.contracted),
		collected: sumRows(rows, (r) => r.collected),
		collectionsRemainder: sumRows(rows, (r) => r.collectionsRemainder),
		futureSales: sumRows(rows, (r) => r.futureSales),
		totalRevenue: sumRows(rows, (r) => r.totalRevenue),
		grossProfit: sumRows(rows, (r) => r.grossProfit),
		marginPerSqm: soldArea > 0 ? sumRows(rows, (r) => r.grossProfit) / soldArea : 0,
		overdueDebt: sumRows(rows, (r) => r.overdueDebt),
		pdPercent:
			sumRows(rows, (r) => r.contracted) > 0
				? (sumRows(rows, (r) => r.overdueDebt) / sumRows(rows, (r) => r.contracted)) * 100
				: 0,
		approvedCostPerSqm: 0,
		actualCostPerSqm: totalConstruction > 0 ? totalSpent / totalConstruction : 0,
		currentCostPerSqm: totalConstruction > 0 ? totalSpent / totalConstruction : 0,
		constructionCosts: sumRows(rows, (r) => r.constructionCosts),
		landCosts: sumRows(rows, (r) => r.landCosts),
		documentationCosts: sumRows(rows, (r) => r.documentationCosts),
		otherCosts: sumRows(rows, (r) => r.otherCosts),
		requiredAmount: sumRows(rows, (r) => r.requiredAmount),
		projectBudget: sumRows(rows, (r) => r.projectBudget),
		totalSpent,
	};
}

function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<p className="text-[10px] font-bold uppercase tracking-wider text-am-text-muted">
			{children}
		</p>
	);
}

function MetricStrip({
	itemCount,
	children,
	className,
}: {
	itemCount: number;
	children: ReactNode;
	className?: string;
}) {
	const cellMin = itemCount >= 6 ? 124 : 136;
	return (
		<div className={cn("overflow-x-auto -mx-0.5 px-0.5 pb-0.5", className)}>
			<div
				className="grid gap-2 w-full"
				style={{
					gridTemplateColumns: `repeat(${itemCount}, minmax(${cellMin}px, 1fr))`,
				}}
			>
				{children}
			</div>
		</div>
	);
}

function MetricTile({
	label,
	value,
	tone = "neutral",
}: {
	label: string;
	value: string;
	tone?: "positive" | "negative" | "neutral" | "warning";
}) {
	return (
		<div className="rounded-lg border border-am-border bg-am-bg px-3 py-2.5 h-[76px] shadow-sm flex flex-col justify-between min-w-0">
			<p
				className="text-[10px] font-semibold uppercase tracking-wide text-am-text-muted leading-snug truncate"
				title={label}
			>
				{label}
			</p>
			<p
				className={cn(
					"text-sm sm:text-base font-bold tabular-nums leading-tight truncate",
					tone === "positive" && "text-emerald-700",
					tone === "negative" && "text-rose-700",
					tone === "warning" && "text-amber-700",
					tone === "neutral" && "text-am-text-strong",
				)}
				title={value}
			>
				{value}
			</p>
		</div>
	);
}

function ProgressSummaryBar({
	totals,
	fmtMoney,
}: {
	totals: ProgressSummaryRow;
	fmtMoney: (kgs: number, projectId?: number) => string;
}) {
	const items = [
		{ label: "Законтрактовано", value: fmtMoney(totals.contracted), icon: Banknote, color: "blue" as const },
		{ label: "Собрано", value: fmtMoney(totals.collected), icon: Wallet, color: "green" as const },
		{ label: "Выручка", value: fmtMoney(totals.totalRevenue), icon: TrendingUp, color: "green" as const },
		{
			label: "Валовая прибыль",
			value: fmtMoney(totals.grossProfit),
			icon: TrendingUp,
			color: moneyTone(totals.grossProfit),
		},
		{
			label: "Просрочка",
			value: fmtMoney(totals.overdueDebt),
			icon: TrendingDown,
			color: totals.overdueDebt > 0 ? ("red" as const) : ("blue" as const),
		},
		{ label: "Затраты", value: fmtMoney(totals.totalSpent), icon: Landmark, color: "yellow" as const },
	];

	return (
		<div className="rounded-xl border border-slate-200 bg-slate-950 text-white shadow-md overflow-hidden">
			<div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between gap-2 min-w-0">
				<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
					Сводка по всем проектам
				</p>
				<p className="text-xs text-slate-400 truncate text-right">
					Продано {fmtArea(totals.soldArea).replace(" м²", "")} м² · остаток{" "}
					{fmtArea(totals.unsoldArea).replace(" м²", "")} м²
				</p>
			</div>
			<div className="p-3 overflow-x-auto">
				<div
					className="grid gap-2 min-w-full"
					style={{ gridTemplateColumns: "repeat(6, minmax(124px, 1fr))" }}
				>
					{items.map((item) => (
						<div key={item.label} className="min-w-0 h-[52px]">
							<KpiCard
								label={item.label}
								value={item.value}
								icon={item.icon}
								color={item.color}
								variant="strip"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function ProjectMetricSection({
	title,
	defaultOpen = true,
	collapsible = false,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	collapsible?: boolean;
	children: ReactNode;
}) {
	if (!collapsible) {
		return (
			<div className="space-y-2">
				<SectionTitle>{title}</SectionTitle>
				{children}
			</div>
		);
	}

	return (
		<Collapsible defaultOpen={defaultOpen}>
			<div className="flex items-center justify-between gap-2">
				<SectionTitle>{title}</SectionTitle>
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="group h-7 px-2 text-xs text-am-text-muted gap-1"
					>
						<ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
						<span className="hidden sm:inline">Развернуть</span>
					</Button>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent className="pt-2">{children}</CollapsibleContent>
		</Collapsible>
	);
}

function ProjectProgressCard({
	row,
	config,
	labelFor,
	onCustomValue,
	formatCell,
	fmtMoney,
}: {
	row: ProgressSummaryRow;
	config: ProgressColumnConfig;
	labelFor: (id: string, defaultLabel: string) => string;
	onCustomValue: (columnId: string, projectId: number, raw: string) => void;
	formatCell: ProgressFormatters["formatCell"];
	fmtMoney: ProgressFormatters["fmtMoney"];
}) {
	const soldPct =
		row.totalSaleableArea > 0
			? Math.round((row.soldArea / row.totalSaleableArea) * 100)
			: 0;

	const colsForGroup = (groupId: ProgressGroupId) =>
		BUILTIN_COLUMNS.filter((c) => c.groupId === groupId && c.id !== "projectName");

	const customForGroup = (groupId: ProgressGroupId) =>
		config.customColumns.filter((c) => c.groupId === groupId);

	const show = (groupId: ProgressGroupId) => config.visibleGroups[groupId] !== false;

	return (
		<Collapsible defaultOpen>
			<article className="rounded-xl border border-am-border bg-white shadow-sm overflow-hidden">
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="group w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="w-9 h-9 rounded-lg bg-am-brand-surface flex items-center justify-center shrink-0">
								<Building2 className="w-4 h-4 text-am-brand" />
							</div>
							<div className="min-w-0">
								<p className="font-semibold text-am-text-strong truncate">{row.projectName}</p>
								<p className="text-xs text-am-text-muted mt-0.5">
									Продано {soldPct}% · {fmtArea(row.soldArea)}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4 shrink-0">
							<div className="text-right hidden sm:block">
								<p className="text-[10px] uppercase tracking-wide text-am-text-muted">Прибыль</p>
								<p
									className={cn(
										"text-sm font-bold tabular-nums",
										row.grossProfit > 0
											? "text-emerald-700"
											: row.grossProfit < 0
												? "text-rose-700"
												: "text-am-text-strong",
									)}
								>
									{fmtMoney(row.grossProfit, row.projectId)}
								</p>
							</div>
							<div className="text-right hidden md:block">
								<p className="text-[10px] uppercase tracking-wide text-am-text-muted">Собрано</p>
								<p className="text-sm font-bold tabular-nums text-am-text-strong">
									{fmtMoney(row.collected, row.projectId)}
								</p>
							</div>
							<ChevronDown className="w-4 h-4 text-am-text-muted transition-transform group-data-[state=open]:rotate-180" />
						</div>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="px-4 pb-4 space-y-4 border-t border-am-border/60">
						{show("projectData") && (() => {
							const cols = colsForGroup("projectData");
							return (
								<ProjectMetricSection title="Данные по проекту">
									<MetricStrip itemCount={cols.length}>
										{cols.map((col) => {
											const val = col.accessor(row) as number;
											return (
												<MetricTile
													key={col.id}
													label={labelFor(col.id, col.defaultLabel)}
													value={formatCell(col.kind, val, row.projectId)}
												/>
											);
										})}
									</MetricStrip>
								</ProjectMetricSection>
							);
						})()}

						{show("collections") && (() => {
							const cols = colsForGroup("collections");
							return (
								<ProjectMetricSection title="Сборы">
									<MetricStrip itemCount={cols.length}>
										{cols.map((col) => {
											const val = col.accessor(row) as number;
											const tone =
												val > 0 ? "positive" : val < 0 ? "negative" : "neutral";
											return (
												<MetricTile
													key={col.id}
													label={labelFor(col.id, col.defaultLabel)}
													value={formatCell(col.kind, val, row.projectId)}
													tone={tone}
												/>
											);
										})}
									</MetricStrip>
								</ProjectMetricSection>
							);
						})()}

						{show("profitability") && (() => {
							const cols = colsForGroup("profitability");
							return (
								<ProjectMetricSection title="Прибыльность">
									<MetricStrip itemCount={cols.length}>
										{cols.map((col) => {
											const val = col.accessor(row) as number;
											const tone =
												col.kind === "percent"
													? val > 0
														? "warning"
														: "neutral"
													: val > 0
														? "positive"
														: val < 0
															? "negative"
															: "neutral";
											return (
												<MetricTile
													key={col.id}
													label={labelFor(col.id, col.defaultLabel)}
													value={formatCell(col.kind, val, row.projectId)}
													tone={tone}
												/>
											);
										})}
									</MetricStrip>
								</ProjectMetricSection>
							);
						})()}

						{show("cost") && (() => {
							const cols = colsForGroup("cost");
							return (
								<ProjectMetricSection title="Себестоимость" collapsible defaultOpen={false}>
									<MetricStrip itemCount={cols.length}>
										{cols.map((col) => {
											const val = col.accessor(row) as number;
											return (
												<MetricTile
													key={col.id}
													label={labelFor(col.id, col.defaultLabel)}
													value={formatCell(col.kind, val, row.projectId)}
												/>
											);
										})}
									</MetricStrip>
								</ProjectMetricSection>
							);
						})()}

						{show("expenses") && (() => {
							const cols = colsForGroup("expenses");
							return (
								<ProjectMetricSection title="Затраты" collapsible defaultOpen={false}>
									<MetricStrip itemCount={cols.length}>
										{cols.map((col) => {
											const val = col.accessor(row) as number;
											return (
												<MetricTile
													key={col.id}
													label={labelFor(col.id, col.defaultLabel)}
													value={formatCell(col.kind, val, row.projectId)}
												/>
											);
										})}
									</MetricStrip>
								</ProjectMetricSection>
							);
						})()}

						{show("custom") && customForGroup("custom").length > 0 && (
							<ProjectMetricSection title="Дополнительно">
								<MetricStrip itemCount={customForGroup("custom").length}>
									{customForGroup("custom").map((col) => {
										const vals = config.customValues[col.id];
										const num = vals?.[String(row.projectId)] ?? 0;
										return (
											<div
												key={col.id}
												className="rounded-lg border border-dashed border-am-border bg-slate-50/80 px-3 py-2.5 h-[76px] flex flex-col justify-between min-w-0"
											>
												<Label
													className="text-[10px] font-semibold uppercase tracking-wide text-am-text-muted truncate"
													title={col.label}
												>
													{col.label}
												</Label>
												<Input
													className="h-8 font-mono tabular-nums text-right bg-white"
													defaultValue={num !== 0 ? String(num) : ""}
													placeholder="—"
													onBlur={(e) =>
														onCustomValue(col.id, row.projectId, e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															(e.target as HTMLInputElement).blur();
													}}
												/>
											</div>
										);
									})}
								</MetricStrip>
							</ProjectMetricSection>
						)}
					</div>
				</CollapsibleContent>
			</article>
		</Collapsible>
	);
}

function SettingsSheet({
	open,
	onOpenChange,
	config,
	onSave,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	config: ProgressColumnConfig;
	onSave: (c: ProgressColumnConfig) => void;
}) {
	const [draft, setDraft] = useState(config);
	const [newLabel, setNewLabel] = useState("");
	const [newGroup, setNewGroup] = useState<ProgressGroupId>("custom");

	const resetDraft = useCallback(() => setDraft(config), [config]);

	const updateLabel = (columnId: string, label: string) => {
		setDraft((prev) => ({
			...prev,
			labelOverrides: { ...prev.labelOverrides, [columnId]: label },
		}));
	};

	const toggleGroup = (groupId: ProgressGroupId, checked: boolean) => {
		setDraft((prev) => ({
			...prev,
			visibleGroups: { ...prev.visibleGroups, [groupId]: checked },
		}));
	};

	const addCustom = () => {
		const label = newLabel.trim();
		if (!label) return;
		const col: ProgressCustomColumn = {
			id: newCustomColumnId(),
			label,
			groupId: newGroup,
		};
		setDraft((prev) => ({
			...prev,
			customColumns: [...prev.customColumns, col],
			visibleGroups: { ...prev.visibleGroups, custom: true },
		}));
		setNewLabel("");
	};

	const removeCustom = (id: string) => {
		setDraft((prev) => {
			const { [id]: _removed, ...restValues } = prev.customValues;
			return {
				...prev,
				customColumns: prev.customColumns.filter((c) => c.id !== id),
				customValues: restValues,
			};
		});
	};

	return (
		<Sheet
			open={open}
			onOpenChange={(v) => {
				if (v) resetDraft();
				onOpenChange(v);
			}}
		>
			<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Настройка прогресса</SheetTitle>
					<SheetDescription>
						Выберите блоки метрик, переименуйте подписи и добавьте свои поля.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Блоки на карточке
						</p>
						{COLUMN_GROUPS.map((g) => (
							<div
								key={g.id}
								className="flex items-center justify-between gap-3 rounded-lg border border-am-border px-3 py-2"
							>
								<Label htmlFor={`group-${g.id}`} className="text-sm font-medium">
									{g.label}
								</Label>
								<Switch
									id={`group-${g.id}`}
									checked={draft.visibleGroups[g.id] !== false}
									onCheckedChange={(checked) => toggleGroup(g.id, checked)}
								/>
							</div>
						))}
					</div>

					<div className="space-y-3 border-t pt-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Подписи метрик
						</p>
						{BUILTIN_COLUMNS.filter((c) => c.id !== "projectName").map((col) => (
							<div key={col.id} className="grid gap-1">
								<Label className="text-xs text-muted-foreground">{col.defaultLabel}</Label>
								<Input
									value={draft.labelOverrides[col.id] ?? col.defaultLabel}
									onChange={(e) => updateLabel(col.id, e.target.value)}
								/>
							</div>
						))}
					</div>

					<div className="space-y-3 border-t pt-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Свои поля
						</p>
						{draft.customColumns.map((col) => (
							<div key={col.id} className="flex gap-2 items-end">
								<div className="flex-1 grid gap-1">
									<Label className="text-xs">Название</Label>
									<Input
										value={col.label}
										onChange={(e) =>
											setDraft((prev) => ({
												...prev,
												customColumns: prev.customColumns.map((c) =>
													c.id === col.id ? { ...c, label: e.target.value } : c,
												),
											}))
										}
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-rose-600 shrink-0"
									onClick={() => removeCustom(col.id)}
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</div>
						))}
						<div className="flex flex-wrap gap-2 items-end">
							<div className="flex-1 min-w-[140px] grid gap-1">
								<Label className="text-xs">Новое поле</Label>
								<Input
									placeholder="Название"
									value={newLabel}
									onChange={(e) => setNewLabel(e.target.value)}
								/>
							</div>
							<Select
								value={newGroup}
								onValueChange={(v) => setNewGroup(v as ProgressGroupId)}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{COLUMN_GROUPS.map((g) => (
										<SelectItem key={g.id} value={g.id}>
											{g.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="button" variant="outline" onClick={addCustom} className="gap-1">
								<Plus className="w-4 h-4" /> Добавить
							</Button>
						</div>
					</div>
				</div>

				<SheetFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Отмена
					</Button>
					<Button
						onClick={() => {
							onSave(draft);
							onOpenChange(false);
						}}
					>
						Сохранить
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function exportProgressCsv(
	rows: ProgressSummaryRow[],
	totals: ProgressSummaryRow,
	labelFor: (id: string, defaultLabel: string) => string,
	config: ProgressColumnConfig,
	formatCell: ProgressFormatters["formatCell"],
) {
	const exportCols = BUILTIN_COLUMNS.filter((c) => c.id !== "projectName");
	const header = [
		"Проект",
		...exportCols.map((c) => labelFor(c.id, c.defaultLabel)),
		...config.customColumns.map((c) => c.label),
	].join(";");
	const allRows = [totals, ...rows];
	const lines = allRows.map((row) => {
		const projectId = row.isTotal ? undefined : row.projectId;
		const cells = [
			row.projectName,
			...exportCols.map((c) =>
				formatCell(c.kind, c.accessor(row) as number | string, projectId),
			),
			...config.customColumns.map((col) => {
				if (row.isTotal) return "";
				const vals = config.customValues[col.id];
				const num = vals?.[String(row.projectId)] ?? 0;
				return num !== 0 ? String(num) : "";
			}),
		];
		return cells.join(";");
	});
	const blob = new Blob([`\uFEFF${[header, ...lines].join("\n")}`], {
		type: "text/csv;charset=utf-8",
	});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "progress-projects.csv";
	a.click();
}

export function ProjectsProgressTab() {
	const [columnConfig, setColumnConfig] = useState(loadProgressColumnConfig);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(loadProgressCurrency);

	useEffect(() => {
		saveProgressCurrency(displayCurrency);
	}, [displayCurrency]);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["construction-projects-progress"],
		queryFn: () =>
			api
				.get<ProgressSummaryRow[]>("/construction/projects/progress-summary")
				.then((r) => r.data),
	});

	const { data: projects = [] } = useQuery<ProjectMeta[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
		staleTime: 5 * 60 * 1000,
	});

	const { data: nbkr } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const projectRows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
	const totalsRow = useMemo(() => buildTotalsRow(projectRows), [projectRows]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return projectRows;
		return projectRows.filter((r) => r.projectName.toLowerCase().includes(q));
	}, [projectRows, search]);

	const labelFor = useCallback(
		(columnId: string, defaultLabel: string) =>
			columnConfig.labelOverrides[columnId]?.trim() || defaultLabel,
		[columnConfig.labelOverrides],
	);

	const projectMetaById = useMemo(
		() =>
			Object.fromEntries(
				projects.map((p) => [
					Number(p.id),
					{
						id: Number(p.id),
						currency: p.currency,
						exchangeRate: p.exchangeRate,
					},
				]),
			),
		[projects],
	);

	const { fmtMoney, formatCell } = useMemo(
		() =>
			createProgressFormatters(
				displayCurrency,
				nbkr?.rates || {},
				projectMetaById,
			),
		[displayCurrency, nbkr?.rates, projectMetaById],
	);

	const rateLabel = nbkr?.rates ? nbkrUsdRateLabel(nbkr.rates) : null;

	const setCustomValue = useCallback(
		(columnId: string, projectId: number, raw: string) => {
			const num = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
			const value = Number.isFinite(num) ? num : 0;
			setColumnConfig((prev) => {
				const next: ProgressColumnConfig = {
					...prev,
					customValues: {
						...prev.customValues,
						[columnId]: {
							...(prev.customValues[columnId] ?? {}),
							[String(projectId)]: value,
						},
					},
				};
				saveProgressColumnConfig(next);
				return next;
			});
		},
		[],
	);

	const persistConfig = (next: ProgressColumnConfig) => {
		setColumnConfig(next);
		saveProgressColumnConfig(next);
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-24 w-full rounded-xl" />
				<div className="grid gap-3 md:grid-cols-2">
					<Skeleton className="h-48 w-full rounded-xl" />
					<Skeleton className="h-48 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
				Не удалось загрузить сводку прогресса. Проверьте API и обновите страницу.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 space-y-3 bg-gradient-to-b from-white via-white to-white/90 backdrop-blur-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm text-muted-foreground">
							{projectRows.length} проектов · площади из шахматки, сборы из договоров,
							затраты из расходов
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative w-full sm:w-56">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-am-text-muted" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Поиск проекта…"
								className="pl-8 h-9"
							/>
						</div>
						<CurrencyToggle
							value={displayCurrency}
							onChange={setDisplayCurrency}
							rateLabel={rateLabel}
							nbkrDate={nbkr?.date}
						/>
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={() =>
								exportProgressCsv(
									projectRows,
									totalsRow,
									labelFor,
									columnConfig,
									formatCell,
								)
							}
						>
							<Download className="w-4 h-4" /> CSV
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={() => setSettingsOpen(true)}
						>
							<Settings2 className="w-4 h-4" /> Настройки
						</Button>
					</div>
				</div>

				<ProgressSummaryBar totals={totalsRow} fmtMoney={fmtMoney} />
			</div>

			{filteredRows.length === 0 ? (
				<div className="rounded-xl border border-dashed border-am-border bg-slate-50 px-6 py-10 text-center text-sm text-am-text-muted">
					<Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
					{search.trim() ? "Нет проектов по запросу" : "Нет данных по проектам"}
				</div>
			) : (
				<div className="grid gap-3 xl:grid-cols-2">
					{filteredRows.map((row) => (
						<ProjectProgressCard
							key={row.projectId}
							row={row}
							config={columnConfig}
							labelFor={labelFor}
							onCustomValue={setCustomValue}
							formatCell={formatCell}
							fmtMoney={fmtMoney}
						/>
					))}
				</div>
			)}

			<SettingsSheet
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				config={columnConfig}
				onSave={persistConfig}
			/>
		</div>
	);
}
