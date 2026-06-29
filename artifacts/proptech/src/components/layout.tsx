import {
	Activity,
	AlertTriangle,
	ArrowRightLeft,
	BarChart,
	BarChart2,
	BarChart3,
	Banknote,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CheckSquare,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Coins,
	CreditCard,
	CircleHelp,
	DollarSign,
	Factory,
	FileText,
	Flag,
	Globe,
	Grid3X3,
	Hammer,
	HardHat,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LineChart,
	ListOrdered,
	LogOut,
	Map,
	Megaphone,
	Menu,
	MessageCircle,
	Package,
	PieChart,
	PiggyBank,
	Plus,
	Receipt,
	Rss,
	Scale,
	ScrollText,
	Search,
	Send,
	Settings,
	ShieldCheck,
	ShoppingBag,
	Target,
	TrendingUp,
	Truck,
	UserCircle,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useFinanceHotkeys } from "@/hooks/use-finance-hotkeys";
import ChatPanel from "@/components/chat-panel";
import {
	CommandPalette,
	useCommandPalette,
	type CommandPaletteItem,
} from "@/components/command-palette";
import { PlanalitycLogo } from "@/components/brand/PlanalitycLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import UserProfileDropdown from "@/components/user-profile-dropdown";
import { CashSummary, type CashAccount } from "@/components/cash-summary";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useModuleAccess } from "@/hooks/use-module-access";
import { useAuth } from "@/lib/auth";
import {
	canAccessSystemSettings,
	detectModuleFromPath,
	type ModuleId,
} from "@/lib/module-access";
import { getModuleDefinition } from "@/lib/module-registry";
import { resolveQuickActions } from "@/lib/quick-create-access";
import { resolveNavItemHref } from "@/lib/nav-hrefs";
import { cn } from "@/lib/utils";

interface NavItem {
	href: string;
	label: string;
	icon: React.ElementType;
}
interface NavSection {
	title: string;
	items: NavItem[];
}
interface Module {
	id: ModuleId;
	label: string;
	shortLabel: string;
	icon: React.ElementType;
	color: string;
	urlPrefix: string[];
	sections: NavSection[];
}

const moduleMeta = (id: ModuleId) => getModuleDefinition(id)!;

const MODULES: Module[] = [
	{
		id: "construction",
		label: moduleMeta("construction").label,
		shortLabel: moduleMeta("construction").shortLabel,
		icon: Grid3X3,
		color: "#0ea5e9",
		urlPrefix: moduleMeta("construction").routePrefixes,
		sections: [
				{
					title: "Проект",
					items: [
						{ href: "/dashboard?tab=construction", label: "Обзор", icon: LayoutDashboard },
						{ href: "/construction/projects", label: "Проекты", icon: Building2 },
						{ href: "/construction/chess", label: "Шахматка", icon: Grid3X3 },
						{ href: "/construction/contracts-sales", label: "Договоры продаж", icon: FileText },
					],
				},
				{
					title: "План и контроль",
					items: [
						{ href: "/construction/stages", label: "Этапы WBS", icon: Flag },
						{ href: "/construction/tasks", label: "Задачи", icon: ClipboardList },
						{ href: "/construction/materials", label: "Материалы", icon: Package },
						{ href: "/construction/contractors", label: "Подрядчики", icon: Briefcase },
						{ href: "/construction/workers", label: "Бригады", icon: Hammer },
						{ href: "/construction/planning/approvals", label: "Согласование", icon: CheckSquare },
					],
				},
				{
					title: "Транзакции",
					items: [
						{ href: "/construction/accounts", label: "Счета", icon: Landmark },
						{ href: "/construction/operations", label: "Операции", icon: ArrowRightLeft },
						{ href: "/construction/accruals", label: "Начисления", icon: ListOrdered },
						{ href: "/construction/cashier", label: "Приём платежей", icon: DollarSign },
						{ href: "/construction/reconciliation", label: "Акт сверки", icon: Scale },
						{ href: "/construction/payroll", label: "Зарплатная ведомость", icon: Banknote },
					],
				},
				{
					title: "Аналитика",
					items: [
						{ href: "/construction/analytics/cashflow", label: "ОДДС", icon: BarChart3 },
						{ href: "/construction/analytics/pnl", label: "ОПУ", icon: LineChart },
						{ href: "/construction/analytics/expenses", label: "Анализ расходов", icon: PieChart },
						{ href: "/construction/analytics/debt", label: "Задолженности", icon: AlertTriangle },
						{ href: "/construction/planning/overdue", label: "Просрочки", icon: AlertTriangle },
						{ href: "/construction/planning/forecast", label: "Будущие поступления", icon: Calendar },
						{ href: "/construction/budget", label: "Бюджет и план/факт", icon: Wallet },
					],
				},
				{
					title: "Справочники",
					items: [
						{ href: "/construction/counterparties", label: "Контрагенты", icon: Users },
						{ href: "/construction/employees", label: "Сотрудники", icon: UserCircle },
						{ href: "/construction/settings", label: "Настройки", icon: Settings },
						{ href: "/construction/help", label: "Помощь", icon: CircleHelp },
					],
				},
				{
					title: "Инструменты",
					items: [
						{ href: "/construction/ai/chat", label: "AI · Чат по ТЗ", icon: MessageCircle },
						{ href: "/construction/ai/snip-check", label: "AI · Проверка СНиП", icon: ShieldCheck },
						{ href: "/construction/ai/tools", label: "AI · Документы", icon: Zap },
						{ href: "/construction/ai/photo-report", label: "AI · Анализ фото", icon: Search },
						{ href: "/construction/ai/contractor-analytics", label: "AI · Подрядчики", icon: BarChart3 },
						{ href: "/construction/ai/telegram", label: "Telegram", icon: Send },
						{ href: "/construction/ai/estimates", label: "AI Смета", icon: BarChart3 },
					],
				},
			],
	},
	{
		id: "finance",
		label: moduleMeta("finance").label,
		shortLabel: moduleMeta("finance").shortLabel,
		icon: Wallet,
		color: "#0891b2",
		urlPrefix: moduleMeta("finance").routePrefixes,
		sections: [
			{
				title: "Обзор и операции",
				items: [
					{ href: "/dashboard?tab=finance", label: "Обзор", icon: LayoutDashboard },
					{ href: "/construction/accounts", label: "Счета", icon: Landmark },
					{
						href: "/construction/operations",
						label: "Операции",
						icon: ArrowRightLeft,
					},
					{ href: "/construction/budget", label: "Бюджет и план/факт", icon: Wallet },
					{
						href: "/construction/payroll",
						label: "Зарплатная ведомость",
						icon: Banknote,
					},
				],
			},
			{
				title: "Договоры и платежи",
				items: [
					{
						href: "/construction/accruals",
						label: "Начисления",
						icon: ListOrdered,
					},
					{
						href: "/construction/cashier",
						label: "Приём платежей",
						icon: DollarSign,
					},
					{
						href: "/construction/reconciliation",
						label: "Акт сверки",
						icon: Scale,
					},
					{
						href: "/construction/planning/forecast",
						label: "Будущие поступления",
						icon: Calendar,
					},
					{
						href: "/construction/planning/overdue",
						label: "Просрочки",
						icon: AlertTriangle,
					},
					{
						href: "/construction/planning/approvals",
						label: "Согласование",
						icon: CheckSquare,
					},
				],
			},
			{
				title: "Финансовая аналитика",
				items: [
					{
						href: "/finance/reports/cashflow",
						label: "ОДДС",
						icon: BarChart3,
					},
					{
						href: "/finance/reports/pnl",
						label: "ОПУ",
						icon: LineChart,
					},
					{
						href: "/finance/reports/expenses",
						label: "Анализ расходов",
						icon: PieChart,
					},
					{
						href: "/finance/reports/debt",
						label: "Задолженности",
						icon: AlertTriangle,
					},
				],
			},
		],
	},
	{
		id: "rental",
		label: moduleMeta("rental").label,
		shortLabel: moduleMeta("rental").shortLabel,
		icon: Home,
		color: "#14b8a6",
		urlPrefix: moduleMeta("rental").routePrefixes,
		sections: [
			{
				title: "Аренда",
				items: [
					{ href: "/dashboard?tab=rental", label: "Дашборд", icon: BarChart3 },
					{ href: "/rental/properties", label: "Объекты", icon: Building2 },
					{ href: "/rental/tenants", label: "Арендаторы", icon: UserCircle },
					{ href: "/rental/contracts", label: "Договоры", icon: FileText },
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/rental/accruals", label: "Начисления", icon: ListOrdered },
					{ href: "/rental/payments", label: "Приём платежей", icon: CreditCard },
					{ href: "/rental/deposits", label: "Депозиты", icon: PiggyBank },
					{ href: "/rental/expenses", label: "Расходы", icon: Receipt },
					{
						href: "/rental/statements",
						label: "Акты собственников",
						icon: ScrollText,
					},
					{
						href: "/rental/accounts",
						label: "Расчётные счета",
						icon: Landmark,
					},
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/rental/reports/odds", label: "ОДДС", icon: BarChart3 },
					{ href: "/rental/reports/opu", label: "ОПУ", icon: LineChart },
					{
						href: "/rental/reports/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/rental/reports/history",
						label: "История платежей",
						icon: Activity,
					},
					{
						href: "/rental/reports/owners",
						label: "Отчёты владельцев",
						icon: ScrollText,
					},
					{
						href: "/rental/reports/summary",
						label: "Сводный отчёт",
						icon: PieChart,
					},
					{ href: "/rental/reports/plan-fact", label: "План-факт", icon: TrendingUp },
				],
			},
			{
				title: "Владельцы",
				items: [
					{ href: "/rental/investors", label: "Владельцы", icon: Users },
					{
						href: "/rental/distributions",
						label: "Распределение",
						icon: Coins,
					},
				],
			},
			{
				title: "Планирование",
				items: [
					{
						href: "/rental/planning/forecast",
						label: "Будущие поступления",
						icon: Calendar,
					},
					{
						href: "/rental/planning/overdue",
						label: "Просрочки",
						icon: AlertTriangle,
					},
					{ href: "/rental/planning/broadcast", label: "Рассылка", icon: Send },
				],
			},
			{
				title: "Справочники",
				items: [
					{ href: "/rental/employees", label: "Сотрудники", icon: UserCircle },
					{ href: "/rental/admin/log", label: "Лог операций", icon: Activity },
					{ href: "/rental/settings", label: "Настройки", icon: Settings },
					{ href: "/rental/help", label: "Помощь", icon: CircleHelp },
				],
			},
		],
	},
	{
		id: "proptech",
		label: moduleMeta("proptech").label,
		shortLabel: moduleMeta("proptech").shortLabel,
		icon: Target,
		color: "#2563eb",
		urlPrefix: moduleMeta("proptech").routePrefixes,
		sections: [
			{
				title: "Продажи",
				items: [
					{ href: "/dashboard?tab=sales", label: "Обзор", icon: LayoutDashboard },
					{ href: "/crm/leads", label: "Лиды", icon: Target },
					{ href: "/crm/deals", label: "Сделки", icon: TrendingUp },
					{ href: "/crm/contracts-sales", label: "Договоры", icon: FileText },
					{ href: "/crm/chess", label: "Шахматка", icon: Grid3X3 },
				],
			},
			{
				title: "Клиенты",
				items: [
					{ href: "/crm/clients", label: "Клиенты 360", icon: Users },
					{ href: "/crm/leads/intake", label: "Приём лидов", icon: Rss },
					{ href: "/crm/client-relations", label: "Клиентский сервис", icon: MessageCircle },
					{ href: "/crm/media-center", label: "Медиацентр", icon: Megaphone },
					{ href: "/construction/planning/broadcast", label: "Рассылка", icon: Send },
				],
			},
			{
				title: "Справочники",
				items: [
					{ href: "/crm/employees", label: "Сотрудники", icon: UserCircle },
					{ href: "/crm/counterparties", label: "Контрагенты", icon: Briefcase },
					{ href: "/crm/help", label: "Помощь", icon: CircleHelp },
				],
			},
		],
	},
	{
		id: "warehouse",
		label: moduleMeta("warehouse").label,
		shortLabel: moduleMeta("warehouse").shortLabel,
		icon: ShoppingBag,
		color: "#0f766e",
		urlPrefix: moduleMeta("warehouse").routePrefixes,
		sections: [
			{
				title: "Управление",
				items: [
					{
						href: "/dashboard?tab=supply",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{ href: "/warehouse/suppliers", label: "Поставщики", icon: Factory },
					{ href: "/warehouse/items", label: "Товары", icon: ShoppingBag },
					{ href: "/warehouse/orders", label: "Заказы", icon: ClipboardList },
					{ href: "/warehouse/companies", label: "Компании", icon: Building },
					{
						href: "/warehouse/requests",
						label: "Заявки прорабов",
						icon: Target,
					},
					{
						href: "/warehouse/approvals",
						label: "Согласования",
						icon: ShieldCheck,
					},
					{ href: "/warehouse/help", label: "Помощь", icon: CircleHelp },
				],
			},
			{
				title: "Снабжение",
				items: [
					{ href: "/warehouse/incoming", label: "Поступления", icon: Truck },
					{
						href: "/warehouse/outgoing",
						label: "Списания / выдача",
						icon: Layers,
					},
					{
						href: "/warehouse/inventory",
						label: "Инвентаризация",
						icon: Scale,
					},
				],
			},
			{
				title: "Финансы и отчёты",
				items: [
					{
						href: "/warehouse/costs",
						label: "Стоимость запасов",
						icon: Wallet,
					},
					{ href: "/warehouse/reports", label: "Отчёты", icon: BarChart },
				],
			},
			{
				title: "Справочники",
				items: [
					{
						href: "/warehouse/counterparties",
						label: "Контрагенты",
						icon: Users,
					},
					{ href: "/warehouse/settings", label: "Настройки", icon: Settings },
				],
			},
			{
				title: "В разработке",
				items: [
					{
						href: "/warehouse/marketplace",
						label: "Маркетплейс",
						icon: Package,
					},
				],
			},
		],
	},
	{
		id: "reports",
		label: moduleMeta("reports").label,
		shortLabel: moduleMeta("reports").shortLabel,
		icon: BarChart3,
		color: "#4f46e5",
		urlPrefix: moduleMeta("reports").routePrefixes,
		sections: [
			{
				title: "Общий свод",
				items: [
					{
						href: "/reports/directions",
						label: "Расчёты с контрагентами",
						icon: BarChart3,
					},
					{
						href: "/reports/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/reports/cashflow",
						label: "Денежный поток",
						icon: BarChart3,
					},
					{
						href: "/reports/payments",
						label: "История платежей",
						icon: Activity,
					},
				],
			},
		],
	},
	{
		id: "consolidated",
		label: moduleMeta("consolidated").label,
		shortLabel: moduleMeta("consolidated").shortLabel,
		icon: Globe,
		color: "#6b7280",
		urlPrefix: moduleMeta("consolidated").routePrefixes,
		sections: [
			{
				title: "Главная",
				items: [
					{ href: "/dashboard?tab=control", label: "Обзор", icon: LayoutDashboard },
					{ href: "/properties", label: "Объекты", icon: Building2 },
					{ href: "/counterparties", label: "Все контрагенты", icon: Users },
					{ href: "/companies", label: "Компании", icon: Building },
					{ href: "/users", label: "Пользователи", icon: UserCircle },
				],
			},
			{
				title: "Общий свод",
				items: [
					{
						href: "/reports/directions",
						label: "Расчёты с контрагентами",
						icon: BarChart3,
					},
					{
						href: "/reports/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/reports/cashflow",
						label: "Денежный поток",
						icon: BarChart3,
					},
					{
						href: "/reports/payments",
						label: "История платежей",
						icon: Activity,
					},
				],
			},
		],
	},
];

function getModuleEntryHref(mod: Module): string {
	return mod.sections[0]?.items[0]?.href || "/dashboard";
}

function defaultOpenSections(moduleId: ModuleId): string[] {
	return moduleId === "rental" ? ["Аренда", "Финансы", "Аналитика"] : [];
}

function detectModule(path: string): ModuleId {
	const detected = detectModuleFromPath(path);
	if (detected === "finance" && path.startsWith("/construction")) return "construction";
	if (detected === "reports" && !path.startsWith("/rental")) return "consolidated";
	return detected;
}

function getDashboardTabLabel(path: string): string | null {
	if (!path.startsWith("/dashboard")) return null;
	const queryIndex = path.indexOf("?");
	if (queryIndex === -1) return "Сводное";
	const tab = new URLSearchParams(path.slice(queryIndex + 1)).get("tab");
	const labels: Record<string, string> = {
		control: "Сводное",
		construction: "Стройка",
		finance: "Финансы",
		supply: "Снабжение",
		sales: "Продажи",
		rental: "Аренда",
		investors: "Инвесторы",
		analytics: "Аналитика",
	};
	return tab ? labels[tab] || null : "Сводное";
}

interface SectionGroupProps {
	section: NavSection;
	location: string;
	moduleId: ModuleId;
	role: string;
	permissions: string[];
	allowedModules: ModuleId[];
	open: boolean;
	collapsed?: boolean;
	onToggle: () => void;
}

function navItemMatches(location: string, href: string): boolean {
	if (location === href) return true;
	if (href.includes("?")) {
		const q = href.indexOf("?");
		const hrefPath = href.slice(0, q);
		const locQ = location.indexOf("?");
		const locPath = locQ === -1 ? location : location.slice(0, locQ);
		if (hrefPath !== locPath) return false;
		const hrefParams = new URLSearchParams(href.slice(q + 1));
		const locParams = new URLSearchParams(locQ === -1 ? "" : location.slice(locQ + 1));
		for (const [key, value] of hrefParams) {
			if (locParams.get(key) !== value) return false;
		}
		return true;
	}
	return location.startsWith(`${href}/`);
}

function SectionGroup({
	section,
	location,
	moduleId,
	role,
	permissions,
	allowedModules,
	open,
	collapsed = false,
	onToggle,
}: SectionGroupProps) {
	const items = section.items.map((item) => ({
		...item,
		href: resolveNavItemHref(item, moduleId, role, permissions, allowedModules),
	}));
	const matchingItems = items.filter((i) =>
		navItemMatches(location, i.href),
	);
	const bestMatch = matchingItems.sort(
		(a, b) => b.href.length - a.href.length,
	)[0];
	const isActiveSection = !!bestMatch;
	const isDevelopmentSection = section.title === "В разработке";

	return (
		<div
			title={collapsed ? section.title : undefined}
			className={cn(
				"rounded-[18px] border transition-all duration-200",
				collapsed && "border-transparent",
				isDevelopmentSection && "border-orange-400/25 bg-orange-500/[0.07]",
				open
					? isDevelopmentSection
						? "border-orange-400/30 bg-orange-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
						: "border-cyan-400/18 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
					: !isDevelopmentSection && "border-transparent",
			)}
		>
			<button
				onClick={onToggle}
				className={cn(
					"flex min-h-9 w-full items-center justify-between gap-2 rounded-[18px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
					collapsed && "justify-center px-2",
					isDevelopmentSection
						? "text-orange-200 hover:text-orange-100"
						: open || isActiveSection
						? "text-cyan-100"
						: "text-white/35 hover:text-white/65",
				)}
			>
				{collapsed ? (
					<span className="h-1.5 w-1.5 rounded-full bg-current" />
				) : (
					<span className="truncate">{section.title}</span>
				)}
				{!collapsed && (open ? (
					<ChevronDown className={cn("w-3.5 h-3.5", isDevelopmentSection ? "text-orange-300" : "text-cyan-300")} />
				) : (
					<ChevronRight className={cn("w-3.5 h-3.5", isDevelopmentSection ? "text-orange-300/75" : "text-white/30")} />
				))}
			</button>
			{open && (
				<div className={cn("space-y-0.5 px-1.5 pb-1.5", collapsed && "px-0")}>
					{items.map((item) => {
						// Only mark as active if this is the most specific match
						const active = bestMatch?.href === item.href;
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<div
									className={cn(
										"flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[14px] px-2.5 py-1.5 text-[13px] transition-all duration-150 group",
										collapsed && "justify-center px-2",
										active
											? isDevelopmentSection
												? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-950/20"
												: "bg-cyan-500 text-white shadow-lg shadow-cyan-950/20"
											: isDevelopmentSection
												? "text-orange-100/76 hover:text-orange-50 hover:bg-orange-400/14"
												: "text-white/58 hover:text-white hover:bg-white/[0.075]",
									)}
									title={collapsed ? item.label : undefined}
								>
									<Icon
										className={cn(
											"w-3.5 h-3.5 flex-shrink-0",
											active
												? isDevelopmentSection
													? "text-slate-950"
													: "text-white"
												: isDevelopmentSection
													? "text-amber-200/70 group-hover:text-amber-100"
													: "text-white/35 group-hover:text-cyan-200",
										)}
									/>
									{!collapsed && <span className="truncate">{item.label}</span>}
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}

export function Layout({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth();
	const [location, setLocation] = useLocation();
	const search = useSearch();
	const pathWithSearch = search
		? `${location}${search.startsWith("?") ? search : `?${search}`}`
		: location;
	const { allowedModules, homePath, canAccess, isLoading: accessLoading, role, permissions } =
		useModuleAccess();
	const [createOpen, setCreateOpen] = useState(false);
	const [mobileModuleOpen, setMobileModuleOpen] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [openSections, setOpenSections] = useState<Set<string>>(new Set());
	const toggleSection = (title: string) =>
		setOpenSections((prev) => {
			const next = new Set(prev);
			if (next.has(title)) next.delete(title);
			else next.add(title);
			return next;
		});
	const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
	useFinanceHotkeys(!!user);
	const { data: allBankAccounts = [] } = useQuery<CashAccount[]>({
		queryKey: ["bank-accounts-all"],
		queryFn: () => api.get("/bank-accounts").then((r) => r.data),
		enabled: !!user,
		staleTime: 60 * 1000,
	});
	const createRef = useRef<HTMLDivElement>(null);
	const moduleSwitcherRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (createRef.current && !createRef.current.contains(e.target as Node)) {
				setCreateOpen(false);
			}
			if (
				moduleSwitcherRef.current &&
				!moduleSwitcherRef.current.contains(e.target as Node)
			) {
				setMobileModuleOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const topLevelHiddenModules = new Set<ModuleId>(["finance", "reports"]);
	const allowedVisibleModules = MODULES.filter((m) =>
		allowedModules.includes(m.id) && !topLevelHiddenModules.has(m.id),
	);
	const businessModules = allowedVisibleModules.filter((m) => m.id !== "consolidated");
	const activeModuleId = detectModule(pathWithSearch);
	const visibleModules =
		businessModules.length <= 1 && activeModuleId !== "consolidated"
			? businessModules
			: allowedVisibleModules;
	const moduleSwitcherModules = useMemo(() => {
		const rentalModule = MODULES.find((m) => m.id === "rental");
		if (
			!rentalModule ||
			!allowedModules.includes("rental") ||
			visibleModules.some((m) => m.id === "rental")
		) {
			return visibleModules;
		}
		const next = [...visibleModules];
		const constructionIndex = visibleModules.findIndex((m) => m.id === "construction");
		next.splice(constructionIndex === -1 ? next.length : constructionIndex + 1, 0, rentalModule);
		return next;
	}, [visibleModules, allowedModules]);

	useEffect(() => {
		if (accessLoading || !user) return;
		if (!canAccess(pathWithSearch)) {
			setLocation(homePath);
		}
	}, [accessLoading, user, pathWithSearch, canAccess, homePath, setLocation]);

	const activeModule =
		allowedVisibleModules.find((m) => m.id === activeModuleId) ||
		allowedVisibleModules[0] ||
		MODULES.find((m) => m.id === activeModuleId) ||
		MODULES[MODULES.length - 1];
	const ModuleIcon = activeModule.icon;
	const activeModuleShortLabel =
		getDashboardTabLabel(pathWithSearch) || activeModule.shortLabel;
	const canOpenSystemSettings = canAccessSystemSettings(role, permissions);
	const activeModuleSettingsHref = "/settings";
	const quickActions = useMemo(
		() =>
			resolveQuickActions(
				activeModule.id,
				role,
				permissions,
				allowedModules,
			),
		[activeModule.id, role, permissions, allowedModules],
	);
	const showQuickCreate = quickActions.length > 0;
	const sidebarCollapsed = false;
	const showModuleSwitcher = moduleSwitcherModules.length > 1;
	const adminRoles = new Set(["company_admin", "admin", "super_admin"]);
	const isAdminUser = adminRoles.has(String((user as { role?: string })?.role ?? role));
	// Роли «стройки» не видят деньги компании (пилюля «Деньги бизнеса» в шапке)
	const moneyBlockedRole = [
		"pto",
		"engineer",
		"pto_engineer",
		"construction_project_manager",
	].includes(String((user as { role?: string })?.role ?? role));

	const navSections = useMemo(() => {
		const userRole = (user as { role?: string })?.role;
		const isPtoRole =
			userRole === "pto" ||
			userRole === "engineer" ||
			userRole === "pto_engineer" ||
			userRole === "construction_project_manager";
		let sections = activeModule.sections;
		if (isPtoRole && activeModule.id === "construction") {
			sections = sections.filter((s) =>
				["Проект", "План и контроль"].includes(s.title),
			);
			// ПТО не видит коммерческие пункты — только обзор, ЖК и шахматка
			sections = sections.map((s) => {
				if (s.title !== "Проект") return s;
				return {
					...s,
					items: s.items.filter((item) =>
						[
							"/dashboard?tab=construction",
							"/construction/projects",
							"/construction/chess",
						].includes(item.href),
					),
				};
			});
		}
		// Роль-фильтры: юрист и финансы видят только свой срез «Стройки» (Фаза 2)
		const FIN_WL = [
			"/dashboard?tab=construction",
			"/construction/projects",
			"/construction/accounts",
			"/construction/operations",
			"/construction/accruals",
			"/construction/cashier",
			"/construction/reconciliation",
			"/construction/payroll",
			"/construction/planning/approvals",
			"/construction/analytics/cashflow",
			"/construction/analytics/pnl",
			"/construction/analytics/expenses",
			"/construction/analytics/debt",
			"/construction/planning/overdue",
			"/construction/planning/forecast",
			"/construction/budget",
			"/construction/counterparties",
		];
		const ROLE_WL: Record<string, string[]> = {
			lawyer: [
				"/dashboard?tab=construction",
				"/construction/projects",
				"/construction/chess",
				"/construction/contracts-sales",
				"/construction/contractors",
				"/construction/planning/approvals",
				"/construction/counterparties",
			],
			finance: FIN_WL,
			finance_director: FIN_WL,
			financial_director: FIN_WL,
			finance_operations_specialist: FIN_WL,
			accountant: FIN_WL,
			chief_accountant: FIN_WL,
		};
		const roleWl = userRole ? ROLE_WL[userRole] : undefined;
		if (roleWl && activeModule.id === "construction" && !isAdminUser) {
			sections = sections.map((s) => ({
				...s,
				items: s.items.filter((item) => roleWl.includes(item.href)),
			}));
		}
		if (!isAdminUser) {
			sections = sections.filter(
				(s) =>
					!s.items.some((item) => item.href.startsWith("/construction/ai")),
			);
			// Дизайн-система — только для администраторов
			sections = sections.map((s) => ({
				...s,
				items: s.items.filter((item) => item.href !== "/design-system"),
			}));
		}
		// Продажи живут в CRM: при доступе к CRM прячем «Договоры продаж» из «Стройки»
		if (
			activeModule.id === "construction" &&
			allowedModules.includes("proptech")
		) {
			sections = sections.map((s) => ({
				...s,
				items: s.items.filter(
					(item) => item.href !== "/construction/contracts-sales",
				),
			}));
		}
		return sections
			.map((section) => ({
				...section,
				items: section.items.filter((item) => item.label !== "Настройки"),
			}))
			.filter((section) => section.items.length > 0);
	}, [activeModule, user, isAdminUser, allowedModules]);

	// On module switch, reset to that module's default-open sections.
	useEffect(() => {
		setOpenSections(new Set(defaultOpenSections(activeModule.id)));
	}, [activeModule.id]);

	useEffect(() => {
		const activeSection = navSections.find((section) =>
			section.items.some((item) => {
				const href = resolveNavItemHref(
					item,
					activeModule.id,
					role,
					permissions,
					allowedModules,
				);
				return navItemMatches(pathWithSearch, href);
			}),
		);
		// Ensure the section for the current page is open; keep manual toggles.
		const t = activeSection?.title ?? navSections[0]?.title;
		if (t) setOpenSections((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
		// Sync the sidebar only when navigation context changes. Manual section
		// toggles should not be immediately overwritten by array identity changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeModule.id, pathWithSearch]);

	const initials =
		user?.firstName && user?.lastName
			? (user.firstName[0] + user.lastName[0]).toUpperCase()
			: user?.firstName
				? user.firstName.slice(0, 2).toUpperCase()
				: user?.email?.slice(0, 2).toUpperCase() || "??";

	const displayName =
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: user?.firstName || "Загрузка...";

	const displayEmail = user?.email || "...";

	const commandItems = useMemo((): CommandPaletteItem[] => {
		const items: CommandPaletteItem[] = [];
		for (const mod of visibleModules) {
			for (const section of mod.sections) {
				for (const item of section.items) {
					const href = resolveNavItemHref(
						item,
						mod.id,
						role,
						permissions,
						allowedModules,
					);
					items.push({
						id: `${mod.id}-${section.title}-${item.href}`,
						label: item.label,
						href,
						group: `${mod.shortLabel} · ${section.title}`,
						keywords: section.title,
					});
				}
			}
		}
		return items;
	}, [visibleModules, role, permissions, allowedModules]);

	useEffect(() => {
		setMobileNavOpen(false);
		setMobileModuleOpen(false);
	}, [pathWithSearch]);

	return (
		<div
			className="flex h-screen overflow-hidden"
			style={{ background: "#F5F8FA" }}
		>
			{/* Skip link для accessibility */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-700 focus:text-white focus:rounded-lg focus:shadow-lg"
			>
				Перейти к основному содержанию
			</a>

			{mobileNavOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/40 lg:hidden"
					aria-label="Закрыть меню"
					onClick={() => setMobileNavOpen(false)}
				/>
			)}

			<CommandPalette
				open={commandOpen}
				onOpenChange={setCommandOpen}
				items={commandItems}
			/>

			{/* ───── MOBILE NAV ───── */}
			<aside
				className={cn(
					"flex-shrink-0 flex flex-col overflow-hidden z-50",
					"fixed inset-y-0 left-0 transition-transform duration-200 lg:hidden",
					"w-[min(86vw,300px)]",
					mobileNavOpen ? "translate-x-0" : "-translate-x-full",
				)}
				style={{
					background:
						"radial-gradient(circle at 20% 0%, rgba(34,211,238,0.28), transparent 28%), radial-gradient(circle at 105% 18%, rgba(16,185,129,0.18), transparent 30%), linear-gradient(145deg, #020617 0%, #062032 46%, #07111f 100%)",
				}}
				>
					{/* Logo */}
				<div className="border-b border-white/8 px-4 py-4">
					<div className="flex items-center justify-between gap-2">
						<PlanalitycLogo
							variant="sidebar"
						/>
					</div>
				</div>

				{/* Nav */}
				<nav
					className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 scrollbar-thin"
					style={{ scrollbarColor: "#ffffff12 transparent" }}
				>
					{navSections.map((section) => (
						<SectionGroup
							key={section.title}
							section={section}
							location={pathWithSearch}
							moduleId={activeModule.id}
							role={role}
							permissions={permissions}
							allowedModules={allowedModules}
							open={openSections.has(section.title)}
							collapsed={sidebarCollapsed}
							onToggle={() =>
								toggleSection(section.title)
							}
						/>
					))}
				</nav>

				{/* Quick create — отдельная панель, чтобы не путать с разделами меню */}
				{showQuickCreate && (
					<div className="px-3 pb-3 pt-2 border-t border-white/8">
						{sidebarCollapsed ? (
							<div className="flex flex-col items-center gap-1">
								{quickActions.slice(0, 4).map((qa) => (
									<Link key={qa.href} href={qa.href}>
										<div
											title={qa.label}
											className="flex h-10 w-10 items-center justify-center rounded-2xl text-cyan-300 hover:bg-cyan-500/14 hover:text-white"
										>
											<Plus className="h-4 w-4" />
										</div>
									</Link>
								))}
							</div>
						) : (
						<div
							className="rounded-lg px-2.5 py-3 border border-cyan-400/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
							style={{
								background:
									"linear-gradient(165deg, rgba(8, 47, 73, 0.78) 0%, rgba(12, 28, 42, 0.94) 100%)",
							}}
						>
							<div className="flex items-center gap-1.5 px-1 mb-1.5">
								<Zap className="w-3 h-3 text-cyan-300/90" />
								<span className="text-[10px] font-semibold text-cyan-100/70 uppercase tracking-wider">
									Быстрое создание
								</span>
							</div>
							{quickActions.map((qa) => (
								<Link key={qa.href} href={qa.href}>
									<div className="flex items-center gap-2 px-2 py-2 rounded-xl text-white/58 hover:text-white hover:bg-cyan-500/14 text-[12px] cursor-pointer transition-all">
										<Plus className="w-3 h-3 text-cyan-300 flex-shrink-0" />
										{qa.label}
									</div>
								</Link>
							))}
						</div>
						)}
					</div>
				)}

				{/* User */}
				<div className="px-3 py-3 border-t border-white/8">
					<Link href={activeModuleSettingsHref}>
						<div className="mb-2 flex items-center gap-2.5 rounded-2xl px-2 py-2 text-sm font-semibold text-white/70 hover:bg-white/8 hover:text-white">
							<Settings className="h-4 w-4 text-cyan-200" />
							<span>Настройки</span>
						</div>
					</Link>
					<div className="flex items-center gap-2.5 px-2 py-2 rounded-2xl hover:bg-white/8 transition-all cursor-pointer group">
						<div
							className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
							style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)" }}
						>
							{initials}
						</div>
						<div className={cn("flex-1 min-w-0", sidebarCollapsed && "hidden")}>
							<div className="text-white text-[12px] font-medium truncate leading-none">
								{displayName}
							</div>
							<div className="text-white/40 text-[10px] truncate mt-0.5">
								{displayEmail}
							</div>
						</div>
						<button
							onClick={logout}
							className={cn("opacity-0 group-hover:opacity-100 transition-opacity", sidebarCollapsed && "hidden")}
						>
							<LogOut className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
						</button>
					</div>
				</div>
			</aside>

			{/* ───── MAIN AREA ───── */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* ── TOP HEADER ── */}
				<header className="min-h-16 border-b border-white/70 bg-white/62 backdrop-blur-2xl flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0 relative z-50 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
					<button
						type="button"
						className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Открыть меню"
						onClick={() => setMobileNavOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</button>

					{/* Module switcher */}
					{showModuleSwitcher ? (
						<div
							ref={moduleSwitcherRef}
							className="relative flex-shrink-0"
						>
							<button
								type="button"
								onClick={() => setMobileModuleOpen((open) => !open)}
								className="flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 bg-white transition-all whitespace-nowrap"
								aria-expanded={mobileModuleOpen}
								aria-haspopup="menu"
								title={activeModule.label}
							>
								<ModuleIcon
									className="w-4 h-4 flex-shrink-0"
									style={{ color: activeModule.color }}
								/>
								<span>{activeModuleShortLabel}</span>
								<ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
							</button>
							{mobileModuleOpen && (
								<div
									className="absolute left-0 top-full z-[9999] mt-2 w-[min(86vw,320px)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/98 p-1.5 shadow-2xl shadow-slate-950/18 backdrop-blur-xl lg:hidden"
									role="menu"
								>
									{moduleSwitcherModules.map((m) => {
										const Icon = m.icon;
										const active = m.id === activeModule.id;
										return (
											<Link key={m.id} href={getModuleEntryHref(m)}>
												<div
													className={cn(
														"flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
														active
															? "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200"
															: "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
													)}
													onClick={() => setMobileModuleOpen(false)}
													role="menuitem"
												>
													<div
														className={cn(
															"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl",
															active ? "bg-cyan-100" : "bg-slate-100",
														)}
													>
														<Icon
															className="h-4 w-4"
															style={{ color: active ? "#0e7490" : m.color }}
														/>
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate leading-tight">{m.label}</p>
														<p className="mt-0.5 text-[11px] font-medium text-slate-500">
															{m.shortLabel}
														</p>
													</div>
													{active && (
														<span className="h-2 w-2 rounded-full bg-cyan-500" />
													)}
												</div>
											</Link>
										);
									})}
								</div>
							)}
							<div className="relative hidden lg:flex items-center gap-1 rounded-[26px] border border-white/80 bg-white/76 p-1.5 shadow-[0_22px_60px_-34px_rgba(8,47,73,0.65)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-5 before:-top-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300/80 before:to-transparent">
								{moduleSwitcherModules.map((m) => {
									const Icon = m.icon;
									const active = m.id === activeModule.id;
									return (
										<Link key={m.id} href={getModuleEntryHref(m)}>
											<div
												className={cn(
													"group relative flex h-11 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200",
														active
															? "min-w-[142px] gap-2 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.24),transparent_34%),linear-gradient(135deg,#020617_0%,#082f49_58%,#0f766e_100%)] px-4 text-white shadow-[0_18px_34px_-22px_rgba(8,145,178,0.95)] ring-1 ring-cyan-200/20"
															: "w-11 text-slate-500 hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-950 hover:shadow-sm",
												)}
												title={m.label}
											>
												{active && (
													<span className="pointer-events-none absolute inset-x-4 -bottom-1 h-1 rounded-full bg-cyan-300/80 blur-[1px]" />
												)}
												<Icon
													className={cn("h-[18px] w-[18px] flex-shrink-0", active && "drop-shadow-[0_0_10px_rgba(103,232,249,0.65)]")}
													style={{ color: active ? "#67e8f9" : m.color }}
												/>
												{active && (
													<span className="truncate">
														{m.id === activeModule.id
															? activeModuleShortLabel
															: m.shortLabel}
													</span>
												)}
												{!active && (
													<span className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white/96 px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-xl shadow-slate-950/12 backdrop-blur transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
														{m.shortLabel}
													</span>
												)}
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 whitespace-nowrap">
							<ModuleIcon
								className="w-4 h-4 flex-shrink-0"
								style={{ color: activeModule.color }}
							/>
							<span>{activeModuleShortLabel}</span>
						</div>
					)}

					{/* Search / command palette */}
					<button
						type="button"
						onClick={() => setCommandOpen(true)}
							className="relative hidden min-w-0 max-w-[820px] flex-1 items-center rounded-[22px] border border-white/80 bg-white/66 py-3 pl-11 pr-16 text-left text-sm text-slate-500 shadow-xl shadow-slate-950/6 backdrop-blur-xl transition-all hover:border-cyan-200 hover:bg-white/86 sm:flex"
						>
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-700/70 pointer-events-none" />
							<span>Поиск по проектам, контрагентам, договорам…</span>
							<span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100/90 px-1.5 py-0.5 rounded-lg font-mono">
							⌘W
						</span>
					</button>
					<button
						type="button"
						className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Поиск"
						onClick={() => setCommandOpen(true)}
					>
						<Search className="w-5 h-5" />
					</button>

					<div className="hidden" />

					{/* Create button */}
					{showQuickCreate && (
						<div className="relative" ref={createRef}>
							<button
								onClick={() => setCreateOpen((o) => !o)}
									className="flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-700 to-teal-600 px-3 text-sm font-bold text-white shadow-xl shadow-cyan-950/18 transition-all hover:-translate-y-0.5 hover:shadow-cyan-950/25 md:px-5 whitespace-nowrap"
							>
								<Plus className="w-4 h-4" />
								Создать
								<ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
							</button>
							{createOpen && (
								<div
										className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-950/16 backdrop-blur-xl"
									style={{ zIndex: 9999 }}
								>
									{quickActions.map((qa) => (
										<Link key={qa.href} href={qa.href}>
											<div
													className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-50 cursor-pointer transition-colors"
												onClick={() => setCreateOpen(false)}
											>
												{qa.label}
											</div>
										</Link>
									))}
								</div>
							)}
						</div>
					)}

					{/* Notifications */}
					{!moneyBlockedRole && (
						<div className="hidden lg:block"><CashSummary accounts={allBankAccounts} /></div>
					)}
					<NotificationBell />
					{/* <NotificationsPanel /> */}

					{/* Messages */}
					<ChatPanel />

				</header>

				<div className="flex min-h-0 flex-1">
					{/* ── VERTICAL MODULE MENU ── */}
					<aside className="hidden w-[280px] flex-shrink-0 flex-col border-r border-white/70 bg-white/72 px-3 py-3 shadow-[18px_0_42px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl lg:flex">
						<div className="mb-3 px-1.5 pt-1">
							<div className="flex items-center gap-3">
								<div
									className="flex h-9 w-9 items-center justify-center rounded-[16px] text-white shadow-lg shadow-cyan-950/15"
									style={{ background: `linear-gradient(135deg, ${activeModule.color}, #0f766e)` }}
								>
									<ModuleIcon className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<p className="truncate text-sm font-bold text-slate-950">{activeModule.label}</p>
									<p className="text-xs font-medium text-slate-500">Меню модуля</p>
								</div>
							</div>
						</div>

						<nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
							{navSections.map((section) => {
								const items = section.items.map((item) => ({
									...item,
									href: resolveNavItemHref(
										item,
										activeModule.id,
										role,
										permissions,
										allowedModules,
									),
								}));
								const matchingItems = items.filter((item) =>
									navItemMatches(pathWithSearch, item.href),
								);
								const bestMatch = matchingItems.sort(
									(a, b) => b.href.length - a.href.length,
								)[0];
								const open = openSections.has(section.title);

								return (
									<div
										key={section.title}
										className={cn(
											"am-nav-section transition-all",
											open
												? "am-nav-section-active"
												: "border-slate-200/70",
										)}
									>
										<button
											type="button"
											onClick={() => toggleSection(section.title)}
											className={cn(
												"am-nav-section-button flex w-full items-center justify-between gap-3 text-left uppercase transition-colors",
												open || bestMatch
													? "text-slate-950"
													: "text-slate-500 hover:text-slate-900",
											)}
										>
											<span className="truncate">{section.title}</span>
											{open ? (
												<ChevronDown className="h-4 w-4 text-cyan-700" />
											) : (
												<ChevronRight className="h-4 w-4 text-slate-400" />
											)}
										</button>
										{open && (
											<div className="space-y-0.5 px-1.5 pb-1.5">
												{items.map((item) => {
													const active = bestMatch?.href === item.href;
													const Icon = item.icon;
													return (
														<Link key={item.href} href={item.href}>
															<div
																className={cn(
																	"am-nav-item flex items-center gap-2.5 transition-all",
																	active
																		? "bg-cyan-600 text-white"
																		: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
																)}
															>
																<Icon className={cn("h-3.5 w-3.5 flex-shrink-0", active ? "text-white" : "text-slate-400")} />
																<span className="truncate">{item.label}</span>
															</div>
														</Link>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</nav>

						<div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
							{canOpenSystemSettings && (
								<Link href={activeModuleSettingsHref}>
									<div className="flex h-9 items-center gap-2.5 rounded-full px-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-950">
										<Settings className="h-4 w-4 text-slate-500" />
										<span>Настройки</span>
									</div>
								</Link>
							)}
							<div className="rounded-[16px] border border-slate-200/80 bg-white/76 p-1 shadow-sm shadow-slate-950/5">
								<UserProfileDropdown />
							</div>
						</div>
					</aside>

					{/* ── CONTENT ── */}
					<main id="main-content" className="flex-1 overflow-y-auto">
						<div className="p-3 sm:p-4 xl:p-6">{children}</div>
					</main>
				</div>
			</div>
		</div>
	);
}
