import { useQuery } from "@tanstack/react-query";
import {
	Banknote,
	Building2,
	ChevronDown,
	Download,
	FileSpreadsheet,
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
import { useCallback, useMemo, useState, type ReactNode } from "react";
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
	kgsToProjectDisplay,
} from "@/lib/project-currency";
import type { DisplayCurrency } from "@/lib/nbkr-currency";
import type { useProjectDisplayCurrency } from "@/hooks/use-project-display-currency";
import { cn } from "@/lib/utils";

type DisplayCurrencyState = ReturnType<typeof useProjectDisplayCurrency>;

type ProgressDataSources = {
	projects?: number;
	units?: number;
	contracts?: number;
	operations?: number;
	expenses?: number;
};

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
	operationIncome?: number;
	operationExpenses?: number;
	legacyExpenses?: number;
	dataSources?: ProgressDataSources;
	[key: string]: string | number | boolean | undefined | ProgressDataSources;
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
	displayUsdRate: number,
): ProgressFormatters {
	const kgsToDisplayAmount = (kgs: number) =>
		kgsToProjectDisplay(kgs, displayCurrency, displayUsdRate);

	const fmtMoney = (kgs: number, _projectId?: number) => {
		if (Math.abs(kgs) <= 0) return "—";
		const amount = kgsToDisplayAmount(kgs);
		if (displayCurrency === "USD") {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
				maximumFractionDigits: 0,
			}).format(amount);
		}
		return `${amount.toLocaleString("ru-KG", { maximumFractionDigits: 0 })} сом`;
	};

	const fmtMoneyPerSqm = (kgs: number, _projectId?: number) => {
		if (kgs <= 0) return "—";
		const amount = kgsToDisplayAmount(kgs);
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
		<p className="text-[10px] font-semibold uppercase text-am-text-muted">
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
	const cellMin = itemCount >= 6 ? 128 : 148;
	return (
		<div className={cn("min-w-0", className)}>
			<div
				className="grid w-full gap-2"
				style={{
					gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${cellMin}px), 1fr))`,
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
		<div className="group/tile flex h-[72px] min-w-0 flex-col justify-between rounded-md border border-am-border bg-white px-3 py-2.5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-am-border-strong hover:shadow-md">
			<p
				className="truncate text-[10px] font-medium uppercase leading-snug text-am-text-muted"
				title={label}
			>
				{label}
			</p>
			<p
				className={cn(
					"truncate text-sm font-semibold leading-tight tabular-nums transition-colors sm:text-base",
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
		<div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/12 transition-shadow duration-200 hover:shadow-slate-950/18">
			<div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
				<div className="min-w-0">
					<p className="shrink-0 text-[10px] font-semibold uppercase text-cyan-200/80">
						Финансовый контур проектов
					</p>
					<p className="mt-0.5 truncate text-xs text-slate-400">
						Проекты + шахматка + договоры + приходы + расходы
					</p>
				</div>
				<p className="hidden truncate text-right text-xs text-slate-400 sm:block">
					Продано {fmtArea(totals.soldArea).replace(" м²", "")} м² · остаток{" "}
					{fmtArea(totals.unsoldArea).replace(" м²", "")} м²
				</p>
			</div>
			<div className="p-3">
				<div
					className="grid min-w-0 gap-2"
					style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 158px), 1fr))" }}
				>
					{items.map((item) => {
						const Icon = item.icon;
						return (
							<div
								key={item.label}
								className="group/kpi flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.09]"
							>
								<div
									className={cn(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover/kpi:scale-105",
										item.color === "green" && "bg-emerald-50 text-emerald-700",
										item.color === "red" && "bg-rose-50 text-rose-700",
										item.color === "yellow" && "bg-amber-50 text-amber-700",
										item.color === "blue" && "bg-am-brand-surface text-am-brand",
									)}
								>
									<Icon className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<p className="truncate text-[11px] font-medium text-slate-400">
										{item.label}
									</p>
									<p className="truncate text-sm font-semibold tabular-nums text-white">
										{item.value}
									</p>
								</div>
							</div>
						);
					})}
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
			<CollapsibleContent className="overflow-hidden pt-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
				{children}
			</CollapsibleContent>
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
	index = 0,
}: {
	row: ProgressSummaryRow;
	config: ProgressColumnConfig;
	labelFor: (id: string, defaultLabel: string) => string;
	onCustomValue: (columnId: string, projectId: number, raw: string) => void;
	formatCell: ProgressFormatters["formatCell"];
	fmtMoney: ProgressFormatters["fmtMoney"];
	index?: number;
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
	const sources = row.dataSources;
	const sourceItems = [
		{ label: "Шахматка", value: sources?.units ?? 0 },
		{ label: "Договоры", value: sources?.contracts ?? 0 },
		{ label: "Операции", value: sources?.operations ?? 0 },
		{ label: "Расходы", value: sources?.expenses ?? 0 },
	];

	return (
		<Collapsible defaultOpen>
			<article
				className="overflow-hidden rounded-lg border border-am-border bg-white shadow-sm transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-bottom-2 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-lg hover:shadow-cyan-950/8"
				style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
			>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="group flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50"
					>
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-am-brand-surface transition-transform duration-200 group-hover:scale-105">
								<Building2 className="h-4 w-4 text-am-brand transition-transform duration-200 group-hover:-rotate-3" />
							</div>
							<div className="min-w-0">
								<p className="truncate font-semibold text-am-text-strong">{row.projectName}</p>
								<div className="mt-1 flex min-w-0 items-center gap-2">
									<div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
										<div
											className="h-full rounded-full bg-am-brand transition-[width] duration-500 ease-out"
											style={{ width: `${Math.max(0, Math.min(soldPct, 100))}%` }}
										/>
									</div>
									<p className="truncate text-xs text-am-text-muted">
										Продано {soldPct}% · {fmtArea(row.soldArea)}
									</p>
								</div>
							</div>
						</div>
						<div className="flex min-w-0 shrink-0 items-center gap-4">
							<div className="hidden max-w-[360px] flex-wrap justify-end gap-1.5 lg:flex">
								{sourceItems.map((item) => (
									<span
										key={item.label}
										className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-1 text-[10px] font-medium text-cyan-800"
									>
										{item.label}: {item.value}
									</span>
								))}
							</div>
							<div className="hidden text-right sm:block">
								<p className="text-[10px] uppercase text-am-text-muted">Прибыль</p>
								<p
									className={cn(
										"text-sm font-semibold tabular-nums",
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
							<div className="hidden text-right md:block">
								<p className="text-[10px] uppercase text-am-text-muted">Собрано</p>
								<p className="text-sm font-semibold tabular-nums text-am-text-strong">
									{fmtMoney(row.collected, row.projectId)}
								</p>
							</div>
							<ChevronDown className="h-4 w-4 text-am-text-muted transition-transform group-data-[state=open]:rotate-180" />
						</div>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
					<div className="space-y-4 border-t border-am-border/60 bg-slate-50/40 px-4 pb-4 pt-4">
						<div className="grid gap-2 sm:grid-cols-4 lg:hidden">
							{sourceItems.map((item) => (
								<div
									key={item.label}
									className="rounded-md border border-cyan-100 bg-white px-3 py-2"
								>
									<p className="text-[10px] font-medium uppercase text-am-text-muted">{item.label}</p>
									<p className="mt-0.5 text-base font-semibold tabular-nums text-am-text-strong">{item.value}</p>
								</div>
							))}
						</div>
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
												className="flex h-[72px] min-w-0 flex-col justify-between rounded-md border border-dashed border-am-border bg-white px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-am-border-strong hover:shadow-sm"
											>
												<Label
													className="truncate text-[10px] font-medium uppercase text-am-text-muted"
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

async function exportProgressXlsx(
	rows: ProgressSummaryRow[],
	totals: ProgressSummaryRow,
	labelFor: (id: string, defaultLabel: string) => string,
	config: ProgressColumnConfig,
	formatCell: ProgressFormatters["formatCell"],
) {
	const XLSX = await import("xlsx");
	const exportCols = BUILTIN_COLUMNS.filter((c) => c.id !== "projectName");
	const headers = [
		"Проект",
		...exportCols.map((c) => labelFor(c.id, c.defaultLabel)),
		"Источник: юниты",
		"Источник: договоры",
		"Источник: операции",
		"Источник: расходы",
		...config.customColumns.map((c) => c.label),
	];
	const allRows = [totals, ...rows];
	const body = allRows.map((row) => {
		const projectId = row.isTotal ? undefined : row.projectId;
		return [
			row.projectName,
			...exportCols.map((c) =>
				formatCell(c.kind, c.accessor(row) as number | string, projectId),
			),
			row.isTotal ? "" : (row.dataSources?.units ?? 0),
			row.isTotal ? "" : (row.dataSources?.contracts ?? 0),
			row.isTotal ? "" : (row.dataSources?.operations ?? 0),
			row.isTotal ? "" : (row.dataSources?.expenses ?? 0),
			...config.customColumns.map((col) => {
				if (row.isTotal) return "";
				const vals = config.customValues[col.id];
				const num = vals?.[String(row.projectId)] ?? 0;
				return num !== 0 ? num : "";
			}),
		];
	});
	const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
	worksheet["!cols"] = headers.map((header) => ({
		wch: Math.max(14, Math.min(34, String(header).length + 4)),
	}));
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Прогресс проектов");
	XLSX.writeFile(workbook, `progress-projects-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function ProjectsProgressTab({
	displayCurrencyState,
}: {
	displayCurrencyState: DisplayCurrencyState;
}) {
	const { displayCurrency, displayUsdRate } = displayCurrencyState;
	const [columnConfig, setColumnConfig] = useState(loadProgressColumnConfig);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [projectFilter, setProjectFilter] = useState("all");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["construction-projects-progress"],
		queryFn: () =>
			api
				.get<ProgressSummaryRow[]>("/construction/projects/progress-summary")
				.then((r) => r.data),
	});

	const projectRows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return projectRows.filter((r) => {
			const matchesProject =
				projectFilter === "all" || String(r.projectId) === projectFilter;
			const matchesSearch = !q || r.projectName.toLowerCase().includes(q);
			return matchesProject && matchesSearch;
		});
	}, [projectRows, projectFilter, search]);

	const totalsRow = useMemo(() => buildTotalsRow(filteredRows), [filteredRows]);

	const labelFor = useCallback(
		(columnId: string, defaultLabel: string) =>
			columnConfig.labelOverrides[columnId]?.trim() || defaultLabel,
		[columnConfig.labelOverrides],
	);

	const { fmtMoney, formatCell } = useMemo(
		() => createProgressFormatters(displayCurrency, displayUsdRate),
		[displayCurrency, displayUsdRate],
	);

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
			<div className="sticky top-0 z-20 space-y-3 border-b border-am-border bg-background/95 pb-4 pt-2 backdrop-blur">
				<div className="grid gap-3 2xl:grid-cols-[minmax(280px,1fr)_auto] 2xl:items-center">
					<p className="max-w-2xl text-sm leading-snug text-muted-foreground">
						{filteredRows.length} из {projectRows.length} проектов · площади из шахматки,
						сборы из договоров, затраты из расходов
					</p>
					<div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-start lg:justify-end">
						<div className="relative min-w-0 lg:w-[260px]">
							<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-am-text-muted" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Поиск проекта…"
								className="h-9 rounded-md bg-white pl-8"
							/>
						</div>
						<Select value={projectFilter} onValueChange={setProjectFilter}>
							<SelectTrigger className="h-9 min-w-0 rounded-md bg-white lg:w-[240px]">
								<SelectValue placeholder="Все проекты" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все проекты</SelectItem>
								{projectRows.map((project) => (
									<SelectItem key={project.projectId} value={String(project.projectId)}>
										{project.projectName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex min-w-0 flex-wrap items-start gap-2 lg:flex-nowrap lg:justify-end">
							<Button
								variant="outline"
								size="sm"
								className="h-9 gap-2 rounded-md"
								onClick={() =>
									exportProgressXlsx(
										filteredRows,
										totalsRow,
										labelFor,
										columnConfig,
										formatCell,
									)
								}
							>
								<FileSpreadsheet className="w-4 h-4" /> Excel
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-9 gap-2 rounded-md"
								onClick={() =>
									exportProgressCsv(
										filteredRows,
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
								className="h-9 gap-2 rounded-md"
								onClick={() => setSettingsOpen(true)}
							>
								<Settings2 className="w-4 h-4" /> Настройки
							</Button>
						</div>
					</div>
				</div>

				<ProgressSummaryBar totals={totalsRow} fmtMoney={fmtMoney} />
			</div>

			{filteredRows.length === 0 ? (
				<div className="rounded-md border border-dashed border-am-border bg-slate-50 px-6 py-10 text-center text-sm text-am-text-muted">
					<Layers className="mx-auto mb-2 h-8 w-8 opacity-40" />
					{search.trim() || projectFilter !== "all"
						? "Нет проектов по выбранным фильтрам"
						: "Нет данных по проектам"}
				</div>
			) : (
				<div className="grid gap-3 2xl:grid-cols-2">
					{filteredRows.map((row, index) => (
						<ProjectProgressCard
							key={row.projectId}
							row={row}
							index={index}
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
