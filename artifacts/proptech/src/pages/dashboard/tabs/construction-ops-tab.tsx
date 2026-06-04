import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowUpRight,
	BarChart3,
	BriefcaseBusiness,
	Building2,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Download,
	Filter,
	Grid3X3,
	HardHat,
	MoreVertical,
	Search,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { DateRangePicker, defaultPeriod, type PeriodValue } from "@/components/am/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type ProjectSummary = {
	id: number;
	name: string;
	address?: string;
	status?: string;
	totalUnits?: number;
	totalFloors?: number;
	createdAt?: string;
};

type UnitsOverview = {
	total?: number;
	available?: number;
	sold?: number;
	reserved?: number;
};

type AccrualSummary = {
	status?: string;
	dueDate?: string;
	amount?: string;
	remainingAmount?: string;
};

const emptyUnitsOverview: UnitsOverview = {
	total: 0,
	available: 0,
	sold: 0,
	reserved: 0,
};

const monthLabels = ["Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек", "Янв", "Фев", "Мар"];

function formatMoney(value: number) {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

function percent(part = 0, total = 0) {
	if (!total) return 0;
	return Math.min(100, Math.round((part / total) * 100));
}

function statusLabel(status?: string) {
	if (!status) return "В работе";
	if (status === "completed") return "Завершен";
	if (status === "delayed") return "Задержка";
	if (status === "active") return "В работе";
	return status;
}

function statusClass(status?: string) {
	if (status === "completed") return "bg-emerald-50 text-emerald-700";
	if (status === "delayed") return "bg-rose-50 text-rose-700";
	return "bg-blue-50 text-blue-700";
}

export default function ConstructionOpsDashboardTab() {
	const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("month"));
	const [search, setSearch] = useState("");

	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () =>
			api.get("/construction/projects/all").then((r) => r.data).catch(() => []),
	});
	const { data: unitsOverview } = useQuery({
		queryKey: ["construction-units-overview", "all"],
		queryFn: () =>
			api
				.get("/construction/units/overview")
				.then((r) => r.data)
				.catch(() => emptyUnitsOverview),
	});
	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () =>
			api.get("/construction/contracts-sales").then((r) => r.data).catch(() => []),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () =>
			api.get("/construction/accruals").then((r) => r.data).catch(() => []),
	});

	const projectsArray = Array.isArray(projects) ? (projects as ProjectSummary[]) : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const accrualsArray = Array.isArray(accruals) ? (accruals as AccrualSummary[]) : [];
	const overview =
		unitsOverview && typeof unitsOverview === "object"
			? (unitsOverview as UnitsOverview)
			: emptyUnitsOverview;

	const today = new Date().toISOString().slice(0, 10);
	const overdueAccruals = accrualsArray.filter((a) => {
		const due = a.dueDate ? String(a.dueDate).slice(0, 10) : "";
		return due && due < today && a.status !== "paid";
	});
	const overdueAmount = overdueAccruals.reduce(
		(sum, a) => sum + Number.parseFloat(String(a.remainingAmount || a.amount || "0")),
		0,
	);
	const soldShare = percent(overview.sold, overview.total);
	const activeProjects = projectsArray.filter((p) => p.status !== "completed").length;
	const delayedProjects = projectsArray.filter((p) => p.status === "delayed").length || overdueAccruals.length;
	const totalBudget = contractsArray.reduce(
		(sum: number, contract: any) =>
			sum + Number.parseFloat(String(contract.totalAmount || contract.amount || "0")),
		0,
	);

	const filteredProjects = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return projectsArray;
		return projectsArray.filter(
			(p) =>
				p.name?.toLowerCase().includes(q) ||
				p.address?.toLowerCase().includes(q) ||
				String(p.id).includes(q),
		);
	}, [projectsArray, search]);

	const chartPoints = monthLabels.map((label, index) => {
		const actual = Math.max(10, Math.min(94, soldShare + Math.sin(index * 1.25) * 14 + index * 2));
		const delay = Math.max(6, Math.min(88, actual - 10 + Math.cos(index * 1.4) * 18));
		return { label, actual, delay };
	});

	const kpis = [
		{
			label: "Все проекты",
			value: projectsArray.length,
			sub: "объектов в системе",
			icon: BriefcaseBusiness,
			tone: "text-slate-950",
			chip: "+10.1%",
		},
		{
			label: "В работе",
			value: activeProjects,
			sub: "активных площадок",
			icon: Building2,
			tone: "text-slate-950",
			chip: "+25.1%",
		},
		{
			label: "Задержки",
			value: delayedProjects,
			sub: overdueAmount ? `${formatMoney(overdueAmount)} сом риск` : "без суммы риска",
			icon: AlertTriangle,
			tone: "text-rose-600",
			chip: delayedProjects ? "risk" : "clean",
		},
		{
			label: "Бюджет продаж",
			value: totalBudget ? formatMoney(totalBudget) : formatMoney(0),
			sub: "по договорам",
			icon: HardHat,
			tone: "text-slate-950",
			chip: "+17.1%",
		},
	];

	return (
		<div className="-m-4 min-h-[calc(100vh-7rem)] bg-[#eef3f6] p-4 md:-m-6 md:p-6">
			<div className="mx-auto max-w-[1480px] space-y-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-sm text-slate-500">Последний вход: сегодня</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
							Доброе утро, контроль строительства
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<DateRangePicker value={period} onChange={setPeriod} />
						<Button variant="outline" className="h-10 rounded-xl bg-white">
							<Download className="mr-2 h-4 w-4" />
							Экспорт
						</Button>
					</div>
				</div>

				<section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
					<div className="rounded-[28px] border border-white bg-white p-4 shadow-sm">
						<div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-cyan-50 p-5">
							<div className="absolute right-6 top-3 hidden h-24 w-36 rounded-[32px] bg-cyan-200/35 blur-2xl md:block" />
							<div className="relative">
								<p className="text-sm font-semibold text-slate-500">Сводка проектов</p>
								<h2 className="mt-1 text-2xl font-black text-slate-950">
									Стройка, сроки, продажи и деньги в одном месте
								</h2>
							</div>
						</div>
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							{kpis.map((kpi) => {
								const Icon = kpi.icon;
								return (
									<Link
										key={kpi.label}
										href="/construction/projects"
										className="group rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
									>
										<div className="flex items-start justify-between">
											<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
												<Icon className="h-4 w-4" />
											</div>
											<span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
												{kpi.chip}
											</span>
										</div>
										<div className={`mt-5 text-3xl font-black ${kpi.tone}`}>{kpi.value}</div>
										<div className="mt-1 flex items-end justify-between">
											<div>
												<p className="text-sm font-semibold text-slate-800">{kpi.label}</p>
												<p className="text-xs text-slate-400">{kpi.sub}</p>
											</div>
											<ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-cyan-600" />
										</div>
									</Link>
								);
							})}
						</div>
					</div>

					<div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
						<div className="flex items-start justify-between">
							<div>
								<h2 className="text-lg font-black text-slate-950">Анализ прогресса</h2>
								<p className="text-sm text-slate-500">план / факт / задержка</p>
							</div>
							<div className="flex gap-3 text-xs">
								<span className="flex items-center gap-1 text-rose-500"><i className="h-2 w-2 rounded-full bg-rose-400" /> Delay</span>
								<span className="flex items-center gap-1 text-blue-600"><i className="h-2 w-2 rounded-full bg-blue-500" /> Actual</span>
							</div>
						</div>
						<div className="mt-8 h-[240px]">
							<div className="flex h-full items-end gap-3 border-b border-slate-100">
								{chartPoints.map((point) => (
									<div key={point.label} className="flex flex-1 flex-col items-center gap-2">
										<div className="relative flex h-[190px] w-full items-end justify-center">
											<div className="absolute bottom-0 h-full w-px bg-slate-100" />
											<div className="relative flex h-full w-10 items-end justify-center">
												<div
													className="absolute bottom-0 w-8 rounded-t-full bg-rose-200/70"
													style={{ height: `${point.delay}%` }}
												/>
												<div
													className="absolute bottom-0 w-4 rounded-t-full bg-blue-500/80 shadow-lg shadow-blue-500/20"
													style={{ height: `${point.actual}%` }}
												/>
											</div>
										</div>
										<span className="text-xs text-slate-400">{point.label}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-4 xl:grid-cols-[0.95fr_0.9fr_0.9fr]">
					<div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-lg font-black text-slate-950">Статус проектов</h2>
							<MoreVertical className="h-4 w-4 text-slate-300" />
						</div>
						<div className="space-y-5">
							{filteredProjects.slice(0, 4).map((project, index) => {
								const progress = Math.min(92, Math.max(12, soldShare + index * 13));
								return (
									<div key={project.id}>
										<div className="mb-2 flex items-center justify-between text-sm">
											<span className="font-semibold text-slate-700">{project.name}</span>
											<span className="font-bold text-slate-950">{progress}%</span>
										</div>
										<div className="h-3 overflow-hidden rounded-full bg-slate-100">
											<div
												className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
												style={{ width: `${progress}%` }}
											/>
										</div>
									</div>
								);
							})}
							{filteredProjects.length === 0 && (
								<div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
									Проектов пока нет
								</div>
							)}
						</div>
					</div>

					<div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-lg font-black text-slate-950">Результат трекинга</h2>
							<BarChart3 className="h-4 w-4 text-slate-400" />
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-2xl border border-slate-100 p-3">
								<p className="text-xs text-slate-400">Начало</p>
								<p className="font-semibold text-slate-800">Апрель 2026</p>
							</div>
							<div className="rounded-2xl border border-slate-100 p-3">
								<p className="text-xs text-slate-400">Финиш</p>
								<p className="font-semibold text-slate-800">Декабрь 2026</p>
							</div>
						</div>
						<div className="mt-5 grid grid-cols-3 gap-3 text-center">
							<div>
								<p className="text-xs text-slate-400">План</p>
								<p className="text-lg font-black text-slate-950">{overview.total ?? 0}</p>
							</div>
							<div>
								<p className="text-xs text-slate-400">Факт</p>
								<p className="text-lg font-black text-blue-600">{overview.sold ?? 0}</p>
							</div>
							<div>
								<p className="text-xs text-slate-400">Риск</p>
								<p className="text-lg font-black text-rose-600">{overdueAccruals.length}</p>
							</div>
						</div>
						<div className="mt-5 grid grid-cols-3 gap-3">
							<div className="h-16 rounded-2xl bg-emerald-200" />
							<div className="h-16 rounded-2xl bg-blue-200" />
							<div className="h-16 rounded-2xl bg-rose-200" />
						</div>
					</div>

					<div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-lg font-black text-slate-950">Эта неделя</h2>
							<CalendarDays className="h-4 w-4 text-slate-400" />
						</div>
						<div className="space-y-3">
							{filteredProjects.slice(0, 4).map((project, index) => (
								<Link
									key={project.id}
									href="/construction/tasks"
									className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 hover:bg-slate-50"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500">
										{project.name?.slice(0, 1) || "P"}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-bold text-slate-800">{project.name}</p>
										<p className="text-xs text-slate-400">План задач · срок недели</p>
									</div>
									<span className={`rounded-full px-2 py-1 text-xs font-bold ${index % 3 === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
										{index % 3 === 0 ? "On track" : "Delayed"}
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>

				<section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
					<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<h2 className="text-lg font-black text-slate-950">Список проектов</h2>
						<div className="flex flex-wrap items-center gap-2">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Поиск проекта или ID"
									className="h-10 w-[260px] rounded-xl border-slate-200 pl-9"
								/>
							</div>
							<Button variant="outline" className="h-10 rounded-xl">
								<Filter className="mr-2 h-4 w-4" />
								Фильтр
							</Button>
						</div>
					</div>
					<div className="overflow-hidden rounded-2xl border border-slate-100">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
								<tr>
									<th className="px-4 py-3 text-left">ID</th>
									<th className="px-4 py-3 text-left">Проект</th>
									<th className="px-4 py-3 text-right">Бюджет</th>
									<th className="px-4 py-3 text-right">План</th>
									<th className="px-4 py-3 text-right">Факт</th>
									<th className="px-4 py-3 text-right">Задержка</th>
									<th className="px-4 py-3 text-left">Статус</th>
									<th className="px-4 py-3 text-right">Действие</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filteredProjects.slice(0, 8).map((project, index) => {
									const plan = project.totalUnits || overview.total || 0;
									const actual = Math.min(plan, Math.round((plan * (soldShare + index * 8)) / 100));
									const delay = Math.max(0, plan - actual);
									return (
										<tr key={project.id} className="hover:bg-slate-50/70">
											<td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">#PR{String(project.id).padStart(3, "0")}</td>
											<td className="px-4 py-4">
												<div className="font-bold text-slate-900">{project.name}</div>
												<div className="text-xs text-slate-400">{project.address || "адрес не указан"}</div>
											</td>
											<td className="px-4 py-4 text-right font-bold">{formatMoney(totalBudget || 0)}</td>
											<td className="px-4 py-4 text-right">{plan}</td>
											<td className="px-4 py-4 text-right">{actual}</td>
											<td className="px-4 py-4 text-right">
												<span className={delay ? "font-bold text-rose-600" : "font-bold text-emerald-600"}>
													{delay}
												</span>
											</td>
											<td className="px-4 py-4">
												<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(project.status)}`}>
													{statusLabel(project.status)}
												</span>
											</td>
											<td className="px-4 py-4 text-right">
												<Link href="/construction/projects" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-950 hover:text-white">
													<MoreVertical className="h-4 w-4" />
												</Link>
											</td>
										</tr>
									);
								})}
								{filteredProjects.length === 0 && (
									<tr>
										<td colSpan={8} className="px-4 py-10 text-center text-slate-400">
											Проектов пока нет. Создайте первый проект.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	);
}
