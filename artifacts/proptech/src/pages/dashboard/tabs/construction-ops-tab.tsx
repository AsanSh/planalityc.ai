import { useQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	Banknote,
	CheckCircle2,
	CreditCard,
	FileText,
	Grid3X3,
	LockKeyhole,
	MessageSquare,
	ReceiptText,
	Scale,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const SALES_STEPS = [
	{
		title: "Шахматка",
		description: "Создать юниты, видеть статусы, исключить двойную продажу.",
		href: "/construction/chess",
		icon: Grid3X3,
		action: "Открыть шахматку",
	},
	{
		title: "Цена и коэффициент",
		description: "Коммерческий директор утверждает базовую цену и коэффициент.",
		href: "/construction/chess",
		icon: LockKeyhole,
		action: "Утвердить цены",
	},
	{
		title: "Бронь и договор",
		description: "Продажник работает только с опубликованными объектами.",
		href: "/construction/contracts-sales",
		icon: FileText,
		action: "Перейти к договорам",
	},
	{
		title: "Начисления",
		description: "График платежей создаётся из договора автоматически.",
		href: "/construction/accruals",
		icon: ReceiptText,
		action: "Проверить график",
	},
	{
		title: "Оплаты",
		description: "Поступления закрывают начисления и показывают остаток.",
		href: "/construction/cashier",
		icon: CreditCard,
		action: "Принять платёж",
	},
	{
		title: "Акт сверки",
		description: "Финансист видит долг, просрочку и сверку по клиенту.",
		href: "/construction/reconciliation",
		icon: Scale,
		action: "Сверить",
	},
	{
		title: "Клиентский сервис",
		description: "Портал, обращения, новости, акции и повторные продажи.",
		href: "/crm/client-relations",
		icon: MessageSquare,
		action: "Открыть сервис",
	},
];

const ROLE_LANES = [
	{
		title: "Коммерческий директор",
		items: ["базовая цена", "коэффициенты", "открытие в продажу", "скидки"],
	},
	{
		title: "Продажник",
		items: ["доступные юниты", "бронь", "клиент", "договор"],
	},
	{
		title: "Финансист",
		items: ["начисления", "оплаты", "просрочки", "акт сверки"],
	},
	{
		title: "Клиентский сервис",
		items: ["портал", "обращения", "акции", "рассылки"],
	},
];

const SECONDARY_AREAS = [
	{
		title: "Себестоимость",
		description: "WBS, задачи, материалы, подрядчики, бюджет и план/факт.",
		href: "/construction/budget",
	},
	{
		title: "Производство",
		description: "Проекты, бригады, зарплатная ведомость и рабочие задачи.",
		href: "/construction/projects",
	},
	{
		title: "Планалитика",
		description: "ОДДС, ОПУ, задолженности, будущие поступления и просрочки.",
		href: "/construction/analytics/cashflow",
	},
];

const emptyUnitsOverview = {
	total: 0,
	available: 0,
	sold: 0,
	reserved: 0,
};

export default function ConstructionOpsDashboardTab() {
	const { data: projects = [], isLoading: loadingProjects } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () =>
			api.get("/construction/projects/all").then((r) => r.data).catch(() => []),
	});
	const { data: unitsOverview, isLoading: loadingUnits } = useQuery({
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

	const projectsArray = Array.isArray(projects) ? projects : [];
	const contractsArray = Array.isArray(contracts) ? contracts : [];
	const accrualsArray = Array.isArray(accruals) ? accruals : [];
	const overview = unitsOverview && typeof unitsOverview === "object"
		? unitsOverview as { total?: number; available?: number; sold?: number; reserved?: number }
		: {};
	const overdueAccruals = accrualsArray.filter((a: { status?: string; dueDate?: string }) => {
		const due = a.dueDate ? String(a.dueDate).slice(0, 10) : "";
		return due && due < new Date().toISOString().slice(0, 10) && a.status !== "paid";
	});

	return (
		<div className="space-y-6">
			<section className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
					<div className="max-w-3xl">
						<p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
							Sales Control MVP
						</p>
						<h1 className="mt-2 text-2xl font-bold tracking-tight">
							Управление продажей недвижимости без хаоса
						</h1>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							Главный рабочий поток: шахматка, утверждение цены, бронь,
							договор, автоматические начисления, оплата, сверка и портал
							клиента. Остальные функции подключаются как второй слой.
						</p>
					</div>
					<Link href="/construction/chess">
						<div className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
							Начать с шахматки
							<ArrowRight className="h-4 w-4" />
						</div>
					</Link>
				</div>
			</section>

			<section className="grid gap-3 md:grid-cols-4">
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<Grid3X3 className="mb-2 h-4 w-4 text-cyan-700" />
					{loadingUnits ? (
						<Skeleton className="h-7 w-16" />
					) : (
						<p className="text-2xl font-bold text-slate-950">{overview.total ?? 0}</p>
					)}
					<p className="text-xs text-slate-500">Юнитов в шахматке</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<ShieldCheck className="mb-2 h-4 w-4 text-emerald-600" />
					<p className="text-2xl font-bold text-slate-950">{overview.available ?? 0}</p>
					<p className="text-xs text-slate-500">Открыто к продаже</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<FileText className="mb-2 h-4 w-4 text-blue-600" />
					<p className="text-2xl font-bold text-slate-950">{contractsArray.length}</p>
					<p className="text-xs text-slate-500">Договоров продаж</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<Banknote className="mb-2 h-4 w-4 text-rose-600" />
					<p className="text-2xl font-bold text-rose-600">{overdueAccruals.length}</p>
					<p className="text-xs text-slate-500">Просроченных начислений</p>
				</div>
			</section>

			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="border-b border-slate-100 px-5 py-4">
					<h2 className="text-base font-semibold text-slate-950">
						Главный поток
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						Пользователь не должен выбирать из десятков разделов. Он должен
						идти по понятной цепочке.
					</p>
				</div>
				<div className="grid md:grid-cols-2 xl:grid-cols-7">
					{SALES_STEPS.map((step, index) => {
						const Icon = step.icon;
						return (
							<Link key={step.title} href={step.href}>
								<div className="group min-h-[190px] cursor-pointer border-b border-r border-slate-100 p-4 hover:bg-cyan-50/50">
									<div className="flex items-start justify-between gap-2">
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 group-hover:bg-cyan-600 group-hover:text-white">
											<Icon className="h-4 w-4" />
										</div>
										<span className="text-[10px] font-semibold text-slate-300">
											{String(index + 1).padStart(2, "0")}
										</span>
									</div>
									<h3 className="mt-3 text-sm font-semibold text-slate-950">
										{step.title}
									</h3>
									<p className="mt-1.5 text-xs leading-5 text-slate-500">
										{step.description}
									</p>
									<p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
										{step.action}
										<ArrowRight className="h-3 w-3" />
									</p>
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_360px]">
				<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="h-4 w-4 text-cyan-700" />
						<h2 className="text-base font-semibold text-slate-950">
							Работа по ролям
						</h2>
					</div>
					<div className="mt-4 grid gap-3 md:grid-cols-2">
						{ROLE_LANES.map((lane) => (
							<div key={lane.title} className="rounded-lg border border-slate-200 p-4">
								<p className="text-sm font-semibold text-slate-950">{lane.title}</p>
								<div className="mt-3 flex flex-wrap gap-2">
									{lane.items.map((item) => (
										<span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
											{item}
										</span>
									))}
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4 text-slate-600" />
						<h2 className="text-base font-semibold text-slate-950">
							Второй слой
						</h2>
					</div>
					<div className="mt-4 space-y-3">
						{SECONDARY_AREAS.map((area) => (
							<Link key={area.title} href={area.href}>
								<div className="rounded-lg border border-slate-200 p-3 hover:border-cyan-200 hover:bg-cyan-50/40">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold text-slate-950">
											{area.title}
										</p>
										<ArrowRight className="h-3.5 w-3.5 text-slate-300" />
									</div>
									<p className="mt-1 text-xs leading-5 text-slate-500">
										{area.description}
									</p>
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{loadingProjects ? (
				<Skeleton className="h-20 rounded-xl" />
			) : projectsArray.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
					Проектов пока нет. Сначала создайте проект, затем импортируйте или
					сгенерируйте шахматку, после этого откройте юниты к продаже.
				</div>
			) : null}
		</div>
	);
}
