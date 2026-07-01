import {
	Check,
	CircleHelp,
	CreditCard,
	Grid3X3,
	MessagesSquare,
	PackageCheck,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type CompanySubscription = {
	name?: string | null;
	accessStatus?: string | null;
	subscriptionPlan?: string | null;
	subscriptionStatus?: string | null;
	subscriptionEndsAt?: string | null;
	subscriptionComment?: string | null;
};

type AuthUserWithCompany = {
	company?: CompanySubscription | null;
};

const PLAN_LABELS: Record<string, string> = {
	trial: "Trial",
	basic: "Basic",
	pro: "Pro",
	enterprise: "Enterprise",
};

const STATUS_LABELS: Record<string, string> = {
	trial: "Пробный период",
	active: "Активна",
	past_due: "Ожидает оплату",
	expired: "Истекла",
	cancelled: "Отменена",
};

const ACCESS_LABELS: Record<string, string> = {
	active: "Доступ открыт",
	suspended: "Доступ приостановлен",
	blocked: "Доступ закрыт",
};

const PLANS = [
	{
		id: "trial",
		name: "Trial",
		description: "Пилотный запуск и знакомство с платформой",
		price: 0,
		period: "14 дней",
		featuresTitle: "Включено:",
		features: [
			"1 компания",
			"1 проект или объект",
			"До 3 пользователей",
			"Базовый dashboard",
			"Настройки компании",
			"Импорт данных",
		],
	},
	{
		id: "basic",
		name: "Basic",
		description: "Для небольшой команды и одного направления",
		price: 4900,
		period: "в месяц",
		featuresTitle: "Все возможности Trial, плюс:",
		features: [
			"До 10 пользователей",
			"До 3 проектов или объектов",
			"CRM и контрагенты",
			"Шахматка",
			"Финансовые операции",
			"Журнал действий",
		],
	},
	{
		id: "pro",
		name: "Pro",
		description: "Для стройки, продаж, финансов и снабжения",
		price: 14900,
		period: "в месяц",
		featuresTitle: "Все возможности Basic, плюс:",
		features: [
			"До 30 пользователей",
			"До 10 проектов или объектов",
			"Снабжение и склад",
			"ПТО и задачи строительства",
			"Авто-договоры",
			"Аналитика ОДДС / ОПУ",
			"Порталы контрагентов",
		],
	},
	{
		id: "enterprise",
		name: "Enterprise",
		description: "Индивидуальная конфигурация для группы компаний",
		price: 39900,
		period: "в месяц",
		featuresTitle: "Все возможности Pro, плюс:",
		features: [
			"Неограниченные проекты по договору",
			"Расширенные права доступа",
			"Приоритетная поддержка",
			"Персональная настройка модулей",
			"Расширенная аналитика",
			"Интеграции по согласованию",
		],
	},
];

const SERVICES = [
	{ name: "Шахматка продаж", category: "Модуль", price: 3500, unit: "в месяц", included: ["basic", "pro", "enterprise"] },
	{ name: "Снабжение и склад", category: "Модуль", price: 5500, unit: "в месяц", included: ["pro", "enterprise"] },
	{ name: "ПТО и задачи строительства", category: "Модуль", price: 6500, unit: "в месяц", included: ["pro", "enterprise"] },
	{ name: "Портал инвесторов", category: "Портал", price: 4500, unit: "в месяц", included: ["enterprise"] },
	{ name: "Портал покупателей", category: "Портал", price: 3500, unit: "в месяц", included: ["pro", "enterprise"] },
	{ name: "Портал подрядчиков", category: "Портал", price: 3500, unit: "в месяц", included: ["pro", "enterprise"] },
	{ name: "Портал поставщиков", category: "Портал", price: 3000, unit: "в месяц", included: ["enterprise"] },
	{ name: "Авто-договоры и шаблоны", category: "Функция", price: 3000, unit: "в месяц", included: ["pro", "enterprise"] },
	{ name: "Рассылки Email / SMS / WhatsApp", category: "Функция", price: 2500, unit: "в месяц + расходы", included: ["enterprise"] },
	{ name: "Чат по задачам и объектам", category: "Функция", price: 2500, unit: "в месяц", included: ["enterprise"] },
	{ name: "AI-помощник по документам", category: "Расширение", price: 7900, unit: "в месяц", included: [] },
	{ name: "Дополнительные 5 пользователей", category: "Расширение", price: 1500, unit: "в месяц", included: [] },
];

const EXTENSIONS = [
	{ title: "Дополнительный проект", price: 2500, description: "Подключение ещё одного ЖК, объекта или направления." },
	{ title: "Дополнительное юр. лицо", price: 1200, description: "Отдельное юридическое лицо в учёте и аналитике." },
	{ title: "Расширенное хранилище", price: 1900, description: "Дополнительный объём для файлов, договоров и фото." },
	{ title: "Индивидуальная настройка", price: 15000, description: "Разовая настройка процессов, шаблонов и ролей." },
];

function money(value: number) {
	if (value === 0) return "Бесплатно";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(value)} сом`;
}

function dateText(value?: string | null) {
	if (!value) return "Без даты окончания";
	return new Date(value).toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

export default function SubscriptionPage() {
	const { user } = useAuth();
	const company = (user as typeof user & AuthUserWithCompany)?.company;
	const currentPlan = company?.subscriptionPlan || "trial";
	const currentStatus = company?.subscriptionStatus || "trial";
	const accessStatus = company?.accessStatus || "active";

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Подписка и услуги</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Тарифы, подключённые возможности и стоимость дополнительных услуг.
					</p>
				</div>
				<Button variant="outline" className="gap-2">
					<CircleHelp className="h-4 w-4" />
					Связаться с администратором
				</Button>
			</div>

			<Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60">
				<CardHeader className="pb-3">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2 text-lg">
								<CreditCard className="h-5 w-5 text-cyan-600" />
								Текущая подписка
							</CardTitle>
							<CardDescription className="mt-1">
								{company?.name || "Ваша компания"} использует тариф{" "}
								<strong>{PLAN_LABELS[currentPlan] || currentPlan}</strong>.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge variant={accessStatus === "active" ? "default" : "destructive"}>
								{ACCESS_LABELS[accessStatus] || accessStatus}
							</Badge>
							<Badge variant={["active", "trial"].includes(currentStatus) ? "secondary" : "destructive"}>
								{STATUS_LABELS[currentStatus] || currentStatus}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-3">
						<div className="rounded-[16px] border border-white/80 bg-white/78 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Тариф
							</p>
							<p className="mt-1 text-xl font-bold">{PLAN_LABELS[currentPlan] || currentPlan}</p>
						</div>
						<div className="rounded-[16px] border border-white/80 bg-white/78 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Действует до
							</p>
							<p className="mt-1 text-xl font-bold">{dateText(company?.subscriptionEndsAt)}</p>
						</div>
						<div className="rounded-[16px] border border-white/80 bg-white/78 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Комментарий
							</p>
							<p className="mt-1 text-sm font-medium text-slate-700">
								{company?.subscriptionComment || "Условия подписки уточняются администратором платформы."}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="plans" className="space-y-4">
				<TabsList>
					<TabsTrigger value="plans">Тарифы</TabsTrigger>
					<TabsTrigger value="services">Услуги</TabsTrigger>
					<TabsTrigger value="extensions">Расширения</TabsTrigger>
				</TabsList>

				<TabsContent value="plans" className="space-y-4">
					<div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
						{PLANS.map((plan) => {
							const active = plan.id === currentPlan;
							return (
								<Card
									key={plan.id}
									className={cn(
										"relative overflow-hidden border-white/80 bg-white",
										active && "border-cyan-400 shadow-xl shadow-cyan-950/10",
									)}
								>
									{active && (
										<div className="bg-cyan-600 px-4 py-2 text-center text-sm font-bold text-white">
											Ваш тариф
										</div>
									)}
									<CardHeader>
										<CardTitle className="text-xl">{plan.name}</CardTitle>
										<CardDescription>{plan.description}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-5">
										<div>
											<p className="text-3xl font-bold tracking-tight">{money(plan.price)}</p>
											<p className="text-sm text-muted-foreground">{plan.period}</p>
										</div>
										<div>
											<p className="mb-3 text-sm font-semibold">{plan.featuresTitle}</p>
											<ul className="space-y-2">
												{plan.features.map((feature) => (
													<li key={feature} className="flex gap-2 text-sm text-slate-700">
														<Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
														<span>{feature}</span>
													</li>
												))}
											</ul>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</TabsContent>

				<TabsContent value="services">
					<Card>
						<CardHeader>
							<CardTitle>Каталог услуг</CardTitle>
							<CardDescription>
								Стоимость модулей и функций, если они подключаются отдельно от тарифа.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Услуга</TableHead>
										<TableHead>Категория</TableHead>
										<TableHead>Стоимость</TableHead>
										<TableHead>Входит в тарифы</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{SERVICES.map((service) => (
										<TableRow key={service.name}>
											<TableCell className="font-medium">{service.name}</TableCell>
											<TableCell>
												<Badge variant="secondary">{service.category}</Badge>
											</TableCell>
											<TableCell>
												{money(service.price)}
												<span className="text-muted-foreground"> · {service.unit}</span>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{service.included.length
													? service.included.map((id) => PLAN_LABELS[id]).join(", ")
													: "Подключается отдельно"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="extensions">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						{EXTENSIONS.map((item) => (
							<Card key={item.title}>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Sparkles className="h-4 w-4 text-cyan-600" />
										{item.title}
									</CardTitle>
									<CardDescription>{item.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<p className="text-2xl font-bold">{money(item.price)}</p>
									<p className="text-sm text-muted-foreground">за подключение или в месяц</p>
								</CardContent>
							</Card>
						))}
					</div>

					<div className="grid gap-4 md:grid-cols-4">
						{[
							{ icon: Grid3X3, label: "Шахматка", text: "Продажи, статусы, цены и договоры." },
							{ icon: PackageCheck, label: "Снабжение", text: "Заявки, поставщики, склад и закупки." },
							{ icon: MessagesSquare, label: "Рассылки и чат", text: "Коммуникации с клиентами и командой." },
							{ icon: ShieldCheck, label: "Порталы", text: "Доступ для инвесторов и контрагентов." },
						].map((item) => (
							<Card key={item.label} className="bg-slate-950 text-white">
								<CardHeader>
									<item.icon className="h-5 w-5 text-cyan-300" />
									<CardTitle className="text-base">{item.label}</CardTitle>
									<CardDescription className="text-white/60">{item.text}</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
