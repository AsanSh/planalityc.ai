import { useQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
	RefreshCw,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/rental-format";

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalyticsSummary = {
	opStats: { totalIncome: number; totalExpense: number };
	contractStats: {
		totalContracts: number;
		totalAmount: number;
		totalPaid: number;
		totalRemaining: number;
	};
};

type CashflowData = {
	summary: { totalInflow: number; totalOutflow: number; netCashflow: number };
	byMonth: Array<{ period: string; inflow: number; outflow: number; net: number }>;
};

type DashboardSummary = {
	totalProperties: number;
	rentedProperties: number;
	freeProperties: number;
	totalTenants: number;
	monthlyRentCharged: number;
	monthlyRentReceived: number;
	outstandingBalance: number;
};

type DebtReport = {
	summary: { totalDebtors: number; totalDebt: number; totalOverdue: number };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS: Record<string, string> = {
	"01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр",
	"05": "Май", "06": "Июн", "07": "Июл", "08": "Авг",
	"09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

function shortMonth(period: string) {
	return MONTHS[period.split("-")[1] ?? ""] ?? period;
}

function fmtShort(n: number): string {
	const abs = Math.abs(n);
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
	if (abs >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`;
	return String(Math.round(n));
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
	label, value, sub, icon: Icon, accent,
}: {
	label: string; value: string; sub?: string;
	icon: React.ElementType; accent: string;
}) {
	return (
		<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
				<span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
					<Icon className="w-4 h-4" style={{ color: accent }} />
				</span>
			</div>
			<span className="text-2xl font-bold text-gray-900 leading-tight">{value}</span>
			{sub && <span className="text-xs text-gray-400">{sub}</span>}
		</div>
	);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressRow({ label, pct, color }: { label: string; pct: number; color: string }) {
	return (
		<div>
			<div className="flex justify-between text-xs text-gray-400 mb-1">
				<span>{label}</span>
				<span>{Math.round(pct)}%</span>
			</div>
			<div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
				<div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
			</div>
		</div>
	);
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
			<TrendingUp className="w-8 h-8 opacity-25" />
			<p className="text-sm text-center max-w-xs text-gray-400">{message}</p>
		</div>
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardTab() {
	const { data: summary, isLoading: l1, isError: e1, refetch: r1 } = useQuery<AnalyticsSummary>({
		queryKey: ["analytics-summary"],
		queryFn: () => api.get<AnalyticsSummary>("/analytics/summary").then((r) => r.data),
		staleTime: 60_000,
		retry: 1,
	});

	const { data: cashflow, isLoading: l2, isError: e2, refetch: r2 } = useQuery<CashflowData>({
		queryKey: ["reports-cashflow-kpi"],
		queryFn: () => api.get<CashflowData>("/reports/cashflow").then((r) => r.data),
		staleTime: 60_000,
		retry: 1,
	});

	const { data: dash, isLoading: l3, isError: e3, refetch: r3 } = useQuery<DashboardSummary>({
		queryKey: ["dashboard-summary"],
		queryFn: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
		staleTime: 60_000,
		retry: 1,
	});

	const { data: debt, isLoading: l4, isError: e4, refetch: r4 } = useQuery<DebtReport>({
		queryKey: ["reports-debt-kpi"],
		queryFn: () => api.get<DebtReport>("/reports/debt").then((r) => r.data),
		staleTime: 60_000,
		retry: 1,
	});

	const anyLoading = l1 || l2 || l3 || l4;
	const anyError = e1 || e2 || e3 || e4;

	if (anyLoading) {
		return (
			<div className="space-y-5">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
				</div>
				<Skeleton className="h-60 rounded-xl" />
				<div className="grid grid-cols-2 gap-3">
					{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
				</div>
			</div>
		);
	}

	const net = cashflow?.summary.netCashflow ?? 0;
	const contractPaid = summary?.contractStats.totalPaid ?? 0;
	const contractTotal = summary?.contractStats.totalAmount ?? 0;
	const contractRemaining = summary?.contractStats.totalRemaining ?? 0;
	const contractCount = Number(summary?.contractStats.totalContracts ?? 0);
	const totalDebt = debt?.summary.totalDebt ?? 0;
	const rentedProps = dash?.rentedProperties ?? 0;
	const totalProps = dash?.totalProperties ?? 0;
	const rentOccupancy = totalProps ? (rentedProps / totalProps) * 100 : 0;
	const contractCollected = contractTotal > 0 ? (contractPaid / contractTotal) * 100 : 0;

	const chartData = (cashflow?.byMonth ?? []).slice(-12).map((row) => ({
		name: shortMonth(row.period),
		"Поступ.": Math.round(row.inflow),
		"Расходы": Math.round(row.outflow),
	}));

	const hasContractData = contractCount > 0;
	const hasRentalData = totalProps > 0;
	const hasCashflowData = chartData.length > 0;
	const hasAnyData = hasContractData || hasRentalData || hasCashflowData;

	return (
		<div className="space-y-5">
			{/* Error banner */}
			{anyError && (
				<div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
					<AlertTriangle className="w-4 h-4 shrink-0" />
					<span className="flex-1">Не удалось загрузить часть данных</span>
					<button
						onClick={() => { if (e1) r1(); if (e2) r2(); if (e3) r3(); if (e4) r4(); }}
						className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900"
					>
						<RefreshCw className="w-3.5 h-3.5" /> Обновить
					</button>
				</div>
			)}

			{!hasAnyData ? (
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
					<EmptyState message="Данные ещё не добавлены. Создайте проекты, договоры и объекты аренды — здесь появится аналитика по всему холдингу." />
				</div>
			) : (
				<>
					{/* KPI Row */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<KpiCard
							label="Нетто денежный поток"
							value={fmtShort(net)}
							sub="за всё время"
							icon={Wallet}
							accent={net >= 0 ? "#22c55e" : "#ef4444"}
						/>
						<KpiCard
							label="Оплачено по договорам"
							value={fmtShort(contractPaid)}
							sub={contractCount > 0 ? `Договоров: ${contractCount}` : "Нет договоров"}
							icon={TrendingUp}
							accent="#0ea5e9"
						/>
						<KpiCard
							label="Долг арендаторов"
							value={fmtShort(totalDebt)}
							sub={`Должников: ${debt?.summary.totalDebtors ?? 0}`}
							icon={AlertCircle}
							accent={totalDebt > 0 ? "#ef4444" : "#94a3b8"}
						/>
						<KpiCard
							label="Объекты аренды"
							value={String(totalProps)}
							sub={totalProps > 0 ? `Занято: ${rentedProps} / Своб: ${dash?.freeProperties ?? 0}` : "Нет объектов"}
							icon={Building2}
							accent="#8b5cf6"
						/>
					</div>

					{/* Cashflow chart */}
					<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h3 className="font-semibold text-gray-900 text-sm">Денежный поток по месяцам</h3>
								<p className="text-xs text-gray-400 mt-0.5">KGS · последние 12 мес.</p>
							</div>
							{hasCashflowData && (
								<span className={`text-base font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
									{net >= 0 ? "+" : ""}{fmtMoney(net)}
								</span>
							)}
						</div>
						{hasCashflowData ? (
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
									<XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
									<YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={56} />
									<Tooltip
										formatter={(v: number, name: string) => [fmtMoney(v), name]}
										contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
									/>
									<Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} iconType="circle" iconSize={8} />
									<Bar dataKey="Поступ." fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
									<Bar dataKey="Расходы" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={28} />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<EmptyState message="Платежи и расходы ещё не зафиксированы" />
						)}
					</div>

					{/* Two-column stats */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Продажи */}
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
							<h3 className="font-semibold text-gray-900 text-sm mb-3">Продажи / Договоры</h3>
							{hasContractData ? (
								<div className="space-y-2.5">
									{[
										{ label: "Всего договоров", value: String(contractCount) },
										{ label: "Сумма договоров", value: fmtMoney(contractTotal) },
										{ label: "Оплачено", value: fmtMoney(contractPaid), color: "text-emerald-600" },
										{ label: "Остаток", value: fmtMoney(contractRemaining), color: contractRemaining > 0 ? "text-amber-600" : "text-gray-400" },
									].map(({ label, value, color }) => (
										<div key={label} className="flex justify-between text-sm">
											<span className="text-gray-500">{label}</span>
											<span className={`font-medium ${color ?? "text-gray-900"}`}>{value}</span>
										</div>
									))}
									{contractTotal > 0 && (
										<ProgressRow label="Собрано" pct={contractCollected} color="#22c55e" />
									)}
								</div>
							) : (
								<EmptyState message="Договоры продаж не добавлены" />
							)}
						</div>

						{/* Аренда */}
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
							<h3 className="font-semibold text-gray-900 text-sm mb-3">Аренда</h3>
							{hasRentalData ? (
								<div className="space-y-2.5">
									{[
										{ label: "Всего объектов", value: String(totalProps) },
										{ label: "Арендаторы", value: String(dash?.totalTenants ?? 0) },
										{ label: "Начислено (мес.)", value: fmtMoney(dash?.monthlyRentCharged ?? 0) },
										{ label: "Получено (мес.)", value: fmtMoney(dash?.monthlyRentReceived ?? 0), color: "text-emerald-600" },
										{ label: "Задолженность", value: fmtMoney(dash?.outstandingBalance ?? 0), color: (dash?.outstandingBalance ?? 0) > 0 ? "text-red-600" : "text-gray-400" },
									].map(({ label, value, color }) => (
										<div key={label} className="flex justify-between text-sm">
											<span className="text-gray-500">{label}</span>
											<span className={`font-medium ${color ?? "text-gray-900"}`}>{value}</span>
										</div>
									))}
									{totalProps > 0 && (
										<ProgressRow label="Заполняемость" pct={rentOccupancy} color="#0ea5e9" />
									)}
								</div>
							) : (
								<EmptyState message="Объекты аренды не добавлены" />
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
