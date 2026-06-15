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
import { AlertCircle, Building2, TrendingUp, Wallet } from "lucide-react";
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardTab() {
	const { data: summary, isLoading: l1 } = useQuery<AnalyticsSummary>({
		queryKey: ["analytics-summary"],
		queryFn: () => api.get<AnalyticsSummary>("/analytics/summary").then((r) => r.data),
		staleTime: 60_000,
	});

	const { data: cashflow, isLoading: l2 } = useQuery<CashflowData>({
		queryKey: ["reports-cashflow-kpi"],
		queryFn: () => api.get<CashflowData>("/reports/cashflow").then((r) => r.data),
		staleTime: 60_000,
	});

	const { data: dash, isLoading: l3 } = useQuery<DashboardSummary>({
		queryKey: ["dashboard-summary"],
		queryFn: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
		staleTime: 60_000,
	});

	const { data: debt, isLoading: l4 } = useQuery<DebtReport>({
		queryKey: ["reports-debt-kpi"],
		queryFn: () => api.get<DebtReport>("/reports/debt").then((r) => r.data),
		staleTime: 60_000,
	});

	if (l1 || l2 || l3 || l4) {
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
	const totalDebt = debt?.summary.totalDebt ?? 0;
	const rentOccupancy = dash?.totalProperties
		? ((dash.rentedProperties ?? 0) / dash.totalProperties) * 100
		: 0;
	const contractCollected = contractTotal > 0
		? (contractPaid / contractTotal) * 100
		: 0;

	const chartData = (cashflow?.byMonth ?? []).slice(-12).map((row) => ({
		name: shortMonth(row.period),
		"Поступ.": Math.round(row.inflow),
		"Расходы": Math.round(row.outflow),
	}));

	return (
		<div className="space-y-5">
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
					sub={`Остаток: ${fmtShort(contractRemaining)}`}
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
					value={String(dash?.totalProperties ?? 0)}
					sub={`Занято: ${dash?.rentedProperties ?? 0} / Своб: ${dash?.freeProperties ?? 0}`}
					icon={Building2}
					accent="#8b5cf6"
				/>
			</div>

			{/* Cashflow chart */}
			{chartData.length > 0 && (
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="font-semibold text-gray-900 text-sm">Денежный поток по месяцам</h3>
							<p className="text-xs text-gray-400 mt-0.5">KGS · последние 12 мес.</p>
						</div>
						<span className={`text-base font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
							{net >= 0 ? "+" : ""}{fmtMoney(net)}
						</span>
					</div>
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
				</div>
			)}

			{/* Two-column stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Продажи */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<h3 className="font-semibold text-gray-900 text-sm mb-3">Продажи / Договоры</h3>
					<div className="space-y-2.5">
						{[
							{ label: "Всего договоров", value: String(summary?.contractStats.totalContracts ?? 0) },
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
				</div>

				{/* Аренда */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<h3 className="font-semibold text-gray-900 text-sm mb-3">Аренда</h3>
					<div className="space-y-2.5">
						{[
							{ label: "Всего объектов", value: String(dash?.totalProperties ?? 0) },
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
						{(dash?.totalProperties ?? 0) > 0 && (
							<ProgressRow label="Заполняемость" pct={rentOccupancy} color="#0ea5e9" />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
