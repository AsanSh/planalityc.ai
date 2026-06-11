import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowRight,
	BarChart2,
	Banknote,
	Building2,
	CalendarClock,
	ClipboardCheck,
	FileSpreadsheet,
	Landmark,
	ListChecks,
	ReceiptText,
	Scale,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { CashSummary } from "@/components/cash-summary";
import { ModuleCommandCenter } from "@/components/dashboard/module-command-center";
import {
	defaultPeriod,
	inPeriod,
	PeriodPicker,
	type PeriodValue,
} from "@/components/period-picker";
import { api } from "@/lib/api";

function fmt(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-RU").format(Math.round(v));
}
function fmtShort(n: any) {
	const v = parseFloat(n || "0");
	if (Number.isNaN(v)) return "0";
	if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
	if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
	return String(Math.round(v));
}

const CAT_COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#f97316",
	"#6b7280",
];

const MONTHS_SHORT = [
	"Янв",
	"Фев",
	"Мар",
	"Апр",
	"Май",
	"Июн",
	"Июл",
	"Авг",
	"Сен",
	"Окт",
	"Ноя",
	"Дек",
];

export default function ConstructionDashboard() {
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const [filterProject, setFilterProject] = useState("all");

	const { data: ops = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});

	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

	// Safe array wrappers
	const opsArray = Array.isArray(ops) ? ops : [];
	const accountsArray = Array.isArray(accounts) ? accounts : [];
	const projectsArray = Array.isArray(projects) ? projects : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];

	const filteredOps = opsArray.filter((o: any) => {
		if (!inPeriod(o.date, period)) return false;
		if (filterProject !== "all" && String(o.projectId) !== filterProject)
			return false;
		return true;
	});

	const totalIncome = filteredOps
		.filter((o: any) => o.type === "income")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
	const totalExpense = filteredOps
		.filter((o: any) => o.type === "expense")
		.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
	const netProfit = totalIncome - totalExpense;
	const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

	const totalAccountsKgs = accountsArray
		.filter((a: any) => a.currency === "KGS")
		.reduce((s: number, a: any) => s + parseFloat(a.currentBalance || "0"), 0);
	const overdueDebt = accrualsArray
		.filter((a: any) => a.status !== "paid" && new Date(a.dueDate) < now)
		.reduce((s: number, a: any) => s + parseFloat(a.remainingAmount || "0"), 0);

	// Expense by category
	const expByCat: Record<string, number> = {};
	filteredOps
		.filter((o: any) => o.type === "expense")
		.forEach((o: any) => {
			const cat = o.category || "Прочее";
			expByCat[cat] = (expByCat[cat] || 0) + parseFloat(o.amountKgs || "0");
		});
	const expCatSorted = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
	const maxExpCat = expCatSorted[0]?.[1] || 1;

	// Monthly cashflow (last 6 months)
	const last6 = Array.from({ length: 6 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	});
	const monthlyData = last6.map((m) => {
		const inc = opsArray
			.filter((o: any) => o.type === "income" && o.date?.startsWith(m))
			.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
		const exp = opsArray
			.filter((o: any) => o.type === "expense" && o.date?.startsWith(m))
			.reduce((s: number, o: any) => s + parseFloat(o.amountKgs || "0"), 0);
		return { m, inc, exp };
	});
	const maxMonthly = Math.max(
		...monthlyData.map((d) => Math.max(d.inc, d.exp)),
		1,
	);

	// Top income clients (by contract total amount)
	const clientData: Record<string, { total: number; paid: number }> = {};
	contractsArray.forEach((c: any) => {
		const total = parseFloat(c.totalAmount || "0");
		const paid = parseFloat(c.paidAmount || "0");
		const name = c.buyerName || "—";
		if (!clientData[name]) clientData[name] = { total: 0, paid: 0 };
		clientData[name].total += total;
		clientData[name].paid += paid;
	});
	const topClients = Object.entries(clientData)
		.filter(([_, d]) => d.total > 0)
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, 5);

	// Top expense counterparties
	const contExp: Record<string, number> = {};
	filteredOps
		.filter((o: any) => o.type === "expense")
		.forEach((o: any) => {
			if (o.description)
				contExp[o.description] =
					(contExp[o.description] || 0) + parseFloat(o.amountKgs || "0");
		});
	const topContExp = Object.entries(contExp)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);
	const maxContAmt = topContExp[0]?.[1] || 1;
	const financeMetrics = [
		{
			label: "Деньги бизнеса",
			value: fmtShort(totalAccountsKgs),
			description: `${accountsArray.length} счетов под контролем`,
			href: "/construction/accounts",
			icon: Wallet,
			tone: "blue" as const,
		},
		{
			label: "Поступления",
			value: fmtShort(totalIncome),
			description: "Деньги по выбранному периоду",
			href: "/construction/operations",
			icon: TrendingUp,
			tone: "emerald" as const,
		},
		{
			label: "Расходы",
			value: fmtShort(totalExpense),
			description: "Оплаты, подрядчики, материалы",
			href: "/construction/operations",
			icon: TrendingDown,
			tone: "amber" as const,
		},
		{
			label: "Дебиторка",
			value: fmtShort(overdueDebt),
			description: "Просроченные обязательства клиентов",
			href: "/construction/analytics/debt",
			icon: AlertCircle,
			tone: overdueDebt > 0 ? ("amber" as const) : ("emerald" as const),
		},
	];
	const financeSteps = [
		{
			title: "Счета и кассы",
			description: "Сначала видим деньги по банкам, кассе и валютам.",
			href: "/construction/accounts",
			icon: Landmark,
			meta: "остатки",
			tone: "blue" as const,
		},
		{
			title: "Операции",
			description: "Фиксируем приход и расход с проектом, статьей и контрагентом.",
			href: "/construction/operations",
			icon: Banknote,
			meta: "первичный учет",
			tone: "emerald" as const,
		},
		{
			title: "Начисления",
			description: "Договор автоматически превращается в график начислений.",
			href: "/construction/accruals",
			icon: ReceiptText,
			meta: "график оплат",
			tone: "cyan" as const,
		},
		{
			title: "ОДДС",
			description: "Движение денег по периодам: статья строкой, месяцы столбцами.",
			href: "/construction/analytics/cashflow",
			icon: FileSpreadsheet,
			meta: "cash flow",
			tone: "violet" as const,
		},
		{
			title: "ОПУ",
			description: "Доходы, расходы и прибыль без смешивания с кассовыми остатками.",
			href: "/construction/analytics/pnl",
			icon: BarChart2,
			meta: "profit & loss",
			tone: "amber" as const,
		},
		{
			title: "План оплат",
			description: "Будущие поступления, просрочки и задолженности в одном ритме.",
			href: "/construction/planning/forecast",
			icon: CalendarClock,
			meta: "контроль сроков",
			tone: "cyan" as const,
		},
	];
	const financeLanes = [
		{
			title: "Финансист",
			description: "операции, счета, сверки",
			value: `${filteredOps.length}`,
			progress: Math.min(100, filteredOps.length * 8),
		},
		{
			title: "Коммерческий директор",
			description: "цены, коэффициенты, договоры",
			value: `${contractsArray.length}`,
			progress: Math.min(100, contractsArray.length * 12),
		},
		{
			title: "Бухгалтерия",
			description: "1С, подтверждение, закрытие",
			value: "1С",
			progress: 62,
		},
	];
	const financeQuickLinks = [
		{
			title: "Сверка 1С",
			description: "банк, импорт, подтверждение",
			href: "/construction/reconciliation",
			icon: Scale,
		},
		{
			title: "Согласование",
			description: "платежи до проведения",
			href: "/construction/planning/approvals",
			icon: ClipboardCheck,
		},
		{
			title: "Бюджет",
			description: "план-факт по проектам",
			href: "/construction/budget",
			icon: ListChecks,
		},
	];
	const financeKpis = [
		{
			href: "/construction/operations",
			label: "Доходы",
			value: fmt(totalIncome),
			helper: "KGS за период",
			icon: TrendingUp,
			accent: "#059669",
			surface: "from-white via-emerald-50/80 to-teal-50/70",
			ring: "border-emerald-100/90 hover:border-emerald-200",
			inverted: false,
			bars: monthlyData.map((d) => d.inc),
		},
		{
			href: "/construction/operations",
			label: "Расходы",
			value: fmt(totalExpense),
			helper: "KGS за период",
			icon: TrendingDown,
			accent: "#e11d48",
			surface: "from-white via-rose-50/70 to-orange-50/60",
			ring: "border-rose-100/90 hover:border-rose-200",
			inverted: false,
			bars: monthlyData.map((d) => d.exp),
		},
		{
			href: "/construction/operations",
			label: "Чистая прибыль",
			value: `${netProfit >= 0 ? "+" : ""}${fmt(netProfit)}`,
			helper: `KGS · рентабельность ${margin.toFixed(1)}%`,
			icon: BarChart2,
			accent: netProfit >= 0 ? "#047857" : "#e11d48",
			surface:
				netProfit >= 0
					? "from-emerald-950 via-emerald-900 to-teal-900"
					: "from-rose-950 via-rose-900 to-orange-900",
			ring: netProfit >= 0 ? "border-emerald-800/80" : "border-rose-800/80",
			inverted: true,
			bars: monthlyData.map((d) => Math.abs(d.inc - d.exp)),
		},
		{
			href: "/construction/accounts",
			label: "Деньги бизнеса",
			value: fmt(totalAccountsKgs),
			helper: `KGS · ${accountsArray.length} счетов`,
			icon: Wallet,
			accent: "#2563eb",
			surface: "from-white via-sky-50/80 to-cyan-50/70",
			ring: "border-sky-100/90 hover:border-sky-200",
			inverted: false,
			bars: accountsArray.slice(0, 6).map((a: any) => Math.abs(parseFloat(a.currentBalance || "0"))),
		},
	];

	return (
		<div className="am-page space-y-4 -mt-1">
			<ModuleCommandCenter
				eyebrow="Финансовый контур"
				title="От договора до денег, ОДДС, ОПУ и контроля долгов"
				description="Финансовый модуль должен вести пользователя по процессу: счета, операции, начисления, отчеты, будущие платежи и просрочки. Ниже остаются графики и детализация."
				primaryHref="/construction/operations"
				primaryLabel="Провести операцию"
				metrics={financeMetrics}
				steps={financeSteps}
				lanes={financeLanes}
				quickLinks={financeQuickLinks}
			/>

			{/* Period / project filter */}
			<div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/85 p-3 shadow-sm backdrop-blur">
				<div className="flex items-center gap-2 flex-wrap">
					<PeriodPicker value={period} onChange={setPeriod} />
					<div className="flex gap-1 bg-gray-100 rounded-lg p-1">
						<button
							onClick={() => setFilterProject("all")}
							className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filterProject === "all" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
						>
							Все проекты
						</button>
						{projectsArray.slice(0, 3).map((p: any) => (
							<button
								key={p.id}
								onClick={() => setFilterProject(String(p.id))}
								className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filterProject === String(p.id) ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
							>
								{p.name}
							</button>
						))}
					</div>
				</div>
				<CashSummary accounts={accountsArray} />
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{financeKpis.map((card, index) => {
					const Icon = card.icon;
					const maxBar = Math.max(...card.bars, 1);
					return (
						<Link key={card.label} href={card.href} className="block no-underline">
							<div
								className={`finance-card-in group relative min-h-[138px] overflow-hidden rounded-[22px] border bg-gradient-to-br ${card.surface} ${card.ring} p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-32px_rgba(15,23,42,0.8)]`}
								style={{ animationDelay: `${index * 55}ms` }}
							>
								<div
									className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-35"
									style={{ backgroundColor: card.accent }}
								/>
								<div
									className="pointer-events-none absolute inset-x-4 bottom-0 h-0.5 opacity-70"
									style={{
										background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)`,
									}}
								/>
								<div className="relative flex items-start justify-between gap-3">
									<div>
										<p
											className={`text-[11px] font-black uppercase tracking-wider ${card.inverted ? "text-white/60" : "text-slate-500"}`}
										>
											{card.label}
										</p>
										<p
											className={`mt-2 text-[28px] font-black leading-none tabular-nums tracking-normal ${card.inverted ? "text-white" : "text-slate-950"}`}
										>
											{card.value}
										</p>
										<p
											className={`mt-2 text-xs font-semibold ${card.inverted ? "text-white/68" : "text-slate-500"}`}
										>
											{card.helper}
										</p>
									</div>
									<div
										className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1 ${card.inverted ? "bg-white/12 text-white ring-white/18" : "bg-white/80 ring-white/80"}`}
										style={{ color: card.inverted ? undefined : card.accent }}
									>
										<Icon className="h-5 w-5" />
									</div>
								</div>
								<div className="relative mt-4 flex h-7 items-end gap-1">
									{card.bars.length > 0 ? (
										card.bars.map((value, barIndex) => (
											<span
												key={`${card.label}-${barIndex}`}
												className={`flex-1 rounded-full transition-all duration-300 group-hover:opacity-100 ${card.inverted ? "bg-white/35" : "bg-white/75"}`}
												style={{
													height: `${Math.max(4, (value / maxBar) * 28)}px`,
													opacity: 0.6 + barIndex * 0.05,
												}}
											/>
										))
									) : (
										<span
											className={`h-1 w-full rounded-full ${card.inverted ? "bg-white/25" : "bg-slate-200"}`}
										/>
									)}
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{/* Second row */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{/* Cashflow chart */}
				<div className="finance-card-in sm:col-span-2 rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-white via-slate-50/80 to-cyan-50/40 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
					<div className="flex items-center justify-between mb-4">
						<div className="text-sm font-black text-slate-800">
							Деньги на счетах (за 6 мес.)
						</div>
						<div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
							<span className="flex items-center gap-1">
								<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
								Приходы
							</span>
							<span className="flex items-center gap-1">
								<span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
								Расходы
							</span>
						</div>
					</div>
					<div className="flex items-end gap-3 h-32">
						{monthlyData.map(({ m, inc, exp }, _i) => {
							const mIdx = parseInt(m.split("-")[1], 10) - 1;
							const incH = Math.round((inc / maxMonthly) * 120);
							const expH = Math.round((exp / maxMonthly) * 120);
							const isCurrentMonth = m === currentMonth;
							return (
								<div
									key={m}
									className="flex-1 flex flex-col items-center gap-1"
								>
									<div className="flex items-end gap-0.5 h-28 w-full">
										<div
											className={`flex-1 rounded-full transition-all ${isCurrentMonth ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" : "bg-emerald-200/90"}`}
											style={{ height: Math.max(2, incH) }}
											title={`Приход: ${fmt(inc)}`}
										/>
										<div
											className={`flex-1 rounded-full transition-all ${isCurrentMonth ? "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" : "bg-rose-200/90"}`}
											style={{ height: Math.max(2, expH) }}
											title={`Расход: ${fmt(exp)}`}
										/>
									</div>
									<div
										className={`text-[10px] ${isCurrentMonth ? "text-gray-700 font-semibold" : "text-gray-600"}`}
									>
										{MONTHS_SHORT[mIdx]}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Рентабельность + Задолженность */}
				<div className="flex flex-col gap-4">
					<div className="finance-card-in relative flex-1 overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
						<div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
						<div className="flex items-center justify-between mb-1">
							<span className="text-xs text-slate-500 font-black uppercase tracking-wider">
								РЕНТАБЕЛЬНОСТЬ
							</span>
							<span className="text-xs font-semibold text-emerald-600/70">цель 100%</span>
						</div>
						<div
							className={`text-3xl font-black mt-1 tracking-normal ${margin >= 0 ? "text-slate-950" : "text-rose-600"}`}
						>
							{margin.toFixed(1)}%
						</div>
						<div className="mt-4 h-2 bg-white/80 rounded-full overflow-hidden ring-1 ring-emerald-100">
							<div
								className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
								style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
							/>
						</div>
					</div>
					<div className="finance-card-in relative flex-1 overflow-hidden rounded-[24px] border border-rose-100 bg-gradient-to-br from-white via-rose-50/70 to-orange-50/60 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
						<div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-rose-400/20 blur-2xl" />
						<div className="flex items-center gap-1 mb-1">
							<AlertCircle className="w-3 h-3 text-rose-600" />
							<span className="text-xs text-slate-500 font-black uppercase tracking-wider">
								ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ
							</span>
						</div>
						<div className="text-2xl font-black text-rose-600 mt-1 tabular-nums">
							{fmt(overdueDebt)}
						</div>
						<div className="text-xs font-semibold text-slate-500 mt-1">KGS просрочено</div>
					</div>
				</div>
			</div>

			{/* Third row: expense dynamics + structure */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{/* Динамика расходов по статьям */}
				<div className="finance-card-in sm:col-span-2 rounded-[24px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
					<div className="text-sm font-black text-slate-800 mb-4">
						Динамика расходов
					</div>
					{expCatSorted.length === 0 ? (
						<div className="text-center py-8 text-gray-300 text-sm">
							Нет расходных операций
						</div>
					) : (
						<div className="space-y-2">
							{expCatSorted.slice(0, 8).map(([cat, amount], i) => {
								const pct = Math.round((amount / maxExpCat) * 100);
								const color = CAT_COLORS[i % CAT_COLORS.length];
								return (
									<div key={cat} className="flex items-center gap-3">
										<div className="w-24 text-xs font-semibold text-slate-500 truncate text-right flex-shrink-0">
											{cat}
										</div>
										<div className="flex-1 h-7 bg-slate-100/80 rounded-full overflow-hidden ring-1 ring-slate-100">
											<div
												className="h-full rounded-full flex items-center px-2 shadow-sm transition-all duration-300"
												style={{
													width: `${pct}%`,
													backgroundColor: `${color}cc`,
													minWidth: 8,
												}}
											>
												<span className="text-[10px] text-white font-medium">
													{pct > 15 ? fmtShort(amount) : ""}
												</span>
											</div>
										</div>
										<div className="w-20 text-xs font-mono text-right text-gray-600">
											{fmt(amount)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Структура расходов (donut-style) */}
				<div className="finance-card-in rounded-[24px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
					<div className="text-sm font-black text-slate-800 mb-4">
						Структура расходов
					</div>
					{expCatSorted.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-32 text-gray-200">
							<BarChart2 className="w-12 h-12" />
						</div>
					) : (
						<>
							{/* Simple svg donut */}
							<DonutChart data={expCatSorted.slice(0, 6)} />
							<div className="space-y-1.5 mt-3">
								{expCatSorted.slice(0, 5).map(([cat, amount], i) => (
									<div key={cat} className="flex items-center gap-2 text-xs">
										<div
											className="w-2 h-2 rounded-full flex-shrink-0"
											style={{ backgroundColor: CAT_COLORS[i] }}
										/>
										<span className="flex-1 truncate text-gray-600">{cat}</span>
										<span className="font-mono text-gray-500">
											{totalExpense > 0
												? Math.round((amount / totalExpense) * 100)
												: 0}
											%
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Bottom: Top clients + top expense */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="finance-card-in rounded-[24px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
					<div className="flex items-center gap-2 mb-4">
						<Users className="w-4 h-4 text-emerald-700" />
						<div className="text-sm font-black text-slate-800">
							Самые доходные клиенты
						</div>
					</div>
					{topClients.length === 0 ? (
						<div className="text-center py-4 text-gray-300 text-sm">
							Нет данных
						</div>
					) : (
						<div className="space-y-3">
							{topClients.map(([name, data]) => {
								const paidPct = (data.paid / data.total) * 100;
								const remaining = data.total - data.paid;
								return (
									<div key={name}>
										<div className="flex items-center justify-between text-sm mb-1">
											<span className="text-gray-700 truncate max-w-[180px]">
												{name}
											</span>
											<span className="font-mono text-xs text-gray-500">
												{fmt(data.total)}
											</span>
										</div>
										<div className="flex items-center gap-2 text-xs font-mono mb-1">
											<span className="text-emerald-600">✓ {fmt(data.paid)}</span>
											<span className="text-gray-600">•</span>
											<span className="text-red-500">{fmt(remaining)} осталось</span>
										</div>
										<div className="h-2 bg-slate-100 rounded-full overflow-hidden flex ring-1 ring-slate-100">
											<div
												className="h-full bg-emerald-500"
												style={{ width: `${paidPct.toFixed(1)}%` }}
											/>
											<div
												className="h-full bg-rose-400"
												style={{ width: `${(100 - paidPct).toFixed(1)}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="finance-card-in rounded-[24px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
					<div className="flex items-center gap-2 mb-4">
						<Building2 className="w-4 h-4 text-rose-600" />
						<div className="text-sm font-black text-slate-800">
							Контрагенты с наибольшими расходами
						</div>
					</div>
					{topContExp.length === 0 ? (
						<div className="text-center py-4 text-gray-300 text-sm">
							Нет расходных операций
						</div>
					) : (
						<div className="space-y-2">
							{topContExp.map(([name, amount]) => (
								<div key={name}>
									<div className="flex items-center justify-between text-sm mb-0.5">
										<span className="text-gray-700 truncate max-w-[200px]">
											{name}
										</span>
										<span className="font-mono font-medium text-rose-600">
											{fmt(amount)}
										</span>
									</div>
									<div className="h-2 bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-100">
										<div
											className="h-full bg-rose-500 rounded-full transition-all duration-300"
											style={{
												width: `${Math.round((amount / maxContAmt) * 100)}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Recent ops */}
			<div className="finance-card-in overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/90 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.72)]">
				<div className="px-5 py-3 border-b border-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm font-black text-slate-800">
						Последние операции
					</div>
					<Link href="/construction/operations">
						<button className="text-xs text-amber-600 hover:text-amber-600 flex items-center gap-1">
							Все операции <ArrowRight className="w-3 h-3" />
						</button>
					</Link>
				</div>
				{filteredOps.length === 0 ? (
					<div className="px-5 py-8 text-center text-gray-600 text-sm">
						Нет операций за период
					</div>
				) : (
					<div>
						{[...filteredOps]
							.reverse()
							.slice(0, 8)
							.map((op: any) => {
								const proj = projectsArray.find(
									(p: any) => p.id === op.projectId,
								);
								const isIncome = op.type === "income";
								const isTransfer = op.type === "transfer";
								return (
									<div
										key={op.id}
										className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50/50"
									>
										<div className="text-xs text-gray-600 w-20 flex-shrink-0">
											{op.date}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm text-gray-800 truncate">
												{op.description}
											</div>
											{op.category && (
												<div className="text-xs text-gray-600">
													{op.category}
												</div>
											)}
										</div>
										<div className="text-xs text-gray-600 flex-shrink-0">
											{proj?.name || ""}
										</div>
										<div
											className={`font-mono font-semibold text-sm flex-shrink-0 ${isIncome ? "text-emerald-600" : isTransfer ? "text-blue-600" : "text-rose-600"}`}
										>
											{isIncome ? "+" : isTransfer ? "⇄" : "−"}
											{fmt(op.amountKgs)}
										</div>
									</div>
								);
							})}
					</div>
				)}
			</div>
		</div>
	);
}

function DonutChart({ data }: { data: [string, number][] }) {
	const total = data.reduce((s, [, v]) => s + v, 0);
	if (total === 0) return null;
	const colors = CAT_COLORS;
	const size = 100;
	const cx = size / 2,
		cy = size / 2,
		r = 35,
		strokeW = 16;
	let cumulative = 0;
	const segments = data.map(([cat, val], i) => {
		const pct = val / total;
		const startAngle = cumulative * 360 - 90;
		cumulative += pct;
		const endAngle = cumulative * 360 - 90;
		const start = polarToCartesian(cx, cy, r, endAngle);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArc = pct > 0.5 ? 1 : 0;
		return {
			d: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
			color: colors[i % colors.length],
			cat,
			val,
		};
	});
	return (
		<div className="flex justify-center">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke="#f3f4f6"
					strokeWidth={strokeW}
				/>
				{segments.map((s, i) => (
					<path
						key={i}
						d={s.d}
						fill="none"
						stroke={s.color}
						strokeWidth={strokeW}
						strokeLinecap="butt"
					>
						<title>
							{s.cat}: {Math.round((s.val / total) * 100)}%
						</title>
					</path>
				))}
			</svg>
		</div>
	);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
