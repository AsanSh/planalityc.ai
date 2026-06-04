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
	Menu,
	MessageCircle,
	Package,
	Pin,
	PinOff,
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
import { useModuleAccess } from "@/hooks/use-module-access";
import { useAuth } from "@/lib/auth";
import { detectModuleFromPath, type ModuleId } from "@/lib/module-access";
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

const MODULES: Module[] = [
	{
		id: "construction",
		label: "Контур продаж",
		shortLabel: "Продажи",
		icon: Grid3X3,
		color: "#0ea5e9",
		urlPrefix: ["/construction"],
		sections: [
			{
				title: "Главный поток",
				items: [
					{
						href: "/dashboard?tab=construction",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{
						href: "/construction/projects",
						label: "Проект / ЖК",
						icon: Building2,
					},
					{ href: "/construction/chess", label: "Шахматка", icon: Grid3X3 },
					{
						href: "/construction/contracts-sales",
						label: "Договоры продаж",
						icon: FileText,
					},
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
						href: "/crm/client-relations",
						label: "Клиентский сервис",
						icon: MessageCircle,
					},
				],
			},
			{
				title: "Себестоимость",
				items: [
					{ href: "/construction/budget", label: "Бюджет и план/факт", icon: Wallet },
					{ href: "/construction/stages", label: "Этапы WBS", icon: Flag },
					{ href: "/construction/tasks", label: "Задачи", icon: ClipboardList },
					{
						href: "/construction/operations",
						label: "Операции",
						icon: ArrowRightLeft,
					},
					{
						href: "/construction/materials",
						label: "Материалы",
						icon: Package,
					},
					{
						href: "/construction/contractors",
						label: "Подрядчики",
						icon: Briefcase,
					},
				],
			},
			{
				title: "Финансы и контроль",
				items: [
					{ href: "/construction/accounts", label: "Счета", icon: Landmark },
					{
						href: "/construction/analytics/cashflow",
						label: "ОДДС",
						icon: BarChart3,
					},
					{
						href: "/construction/analytics/pnl",
						label: "ОПУ",
						icon: LineChart,
					},
					{
						href: "/construction/analytics/expenses",
						label: "Анализ расходов",
						icon: PieChart,
					},
					{
						href: "/construction/analytics/debt",
						label: "Задолженности",
						icon: AlertTriangle,
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
				title: "Производство",
				items: [
					{ href: "/construction/workers", label: "Бригады", icon: Hammer },
					{
						href: "/construction/payroll",
						label: "Зарплатная ведомость",
						icon: Banknote,
					},
					{
						href: "/construction/planning/broadcast",
						label: "Рассылка",
						icon: Send,
					},
				],
			},
			{
				title: "AI и документы",
				items: [
					{
						href: "/construction/ai/chat",
						label: "Чат по ТЗ",
						icon: MessageCircle,
					},
					{
						href: "/construction/ai/snip-check",
						label: "Проверка СНиП",
						icon: ShieldCheck,
					},
					{
						href: "/construction/ai/tools",
						label: "Генерация документов",
						icon: Zap,
					},
					{
						href: "/construction/ai/photo-report",
						label: "Анализ фото",
						icon: Search,
					},
					{
						href: "/construction/ai/contractor-analytics",
						label: "Анализ подрядчиков",
						icon: BarChart3,
					},
					{ href: "/construction/ai/telegram", label: "Telegram", icon: Send },
					{
						href: "/construction/ai/estimates",
						label: "AI Смета",
						icon: BarChart3,
					},
				],
			},
			{
				title: "Настройки",
				items: [
					{
						href: "/construction/counterparties",
						label: "Контрагенты",
						icon: Users,
					},
					{
						href: "/construction/employees",
						label: "Сотрудники",
						icon: UserCircle,
					},
					{
						href: "/construction/settings",
						label: "Настройки",
						icon: Settings,
					},
				],
			},
		],
	},
	{
		id: "rental",
		label: "Аренда",
		shortLabel: "Аренда",
		icon: Home,
		color: "#14b8a6",
		urlPrefix: ["/rental"],
		sections: [
			{
				title: "Управление",
				items: [
					{ href: "/dashboard?tab=rental", label: "Обзор", icon: BarChart3 },
					{ href: "/rental/properties", label: "Объекты", icon: Building2 },
					{ href: "/rental/tenants", label: "Арендаторы", icon: UserCircle },
					{ href: "/rental/counterparties", label: "Контрагенты", icon: Users },
					{ href: "/rental/contracts", label: "Договоры", icon: FileText },
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/rental/accruals", label: "Начисление", icon: ListOrdered },
					{ href: "/rental/payments", label: "Платежи", icon: CreditCard },
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
					{ href: "/rental/analytics/odds", label: "ОДДС", icon: BarChart3 },
					{ href: "/rental/analytics/plan-fact", label: "План-факт", icon: TrendingUp },
					{ href: "/rental/analytics/opu", label: "ОПУ", icon: LineChart },
					{
						href: "/rental/analytics/debt",
						label: "Задолженность",
						icon: AlertTriangle,
					},
					{
						href: "/rental/analytics/history",
						label: "История платежей",
						icon: Activity,
					},
					{
						href: "/rental/analytics/owners",
						label: "Отчёты владельцев",
						icon: ScrollText,
					},
					{
						href: "/rental/analytics/summary",
						label: "Сводный отчёт",
						icon: PieChart,
					},
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
				title: "Администратор",
				items: [
					{ href: "/rental/employees", label: "Сотрудники", icon: UserCircle },
					{ href: "/rental/admin/log", label: "Лог операций", icon: Activity },
					{ href: "/rental/settings", label: "Настройки", icon: Settings },
				],
			},
		],
	},
	{
		id: "proptech",
		label: "CRM / Продажи",
		shortLabel: "CRM",
		icon: Target,
		color: "#2563eb",
		urlPrefix: ["/proptech", "/sales", "/crm"],
		sections: [
			{
				title: "CRM",
				items: [
					{
						href: "/dashboard?tab=sales",
						label: "Обзор",
						icon: LayoutDashboard,
					},
					{ href: "/crm/leads", label: "Лиды", icon: Target },
					{ href: "/crm/leads/intake", label: "Приём лидов", icon: Rss },
					{ href: "/crm/clients", label: "Клиенты", icon: Users },
					{
						href: "/crm/client-relations",
						label: "Клиентский сервис",
						icon: MessageCircle,
					},
					{ href: "/crm/employees", label: "Сотрудники", icon: Users },
					{ href: "/crm/counterparties", label: "Контрагенты", icon: Briefcase },
					{ href: "/crm/deals", label: "Сделки", icon: TrendingUp },
					{ href: "/crm/contracts-sales", label: "Договоры", icon: FileText },
					{
						href: "/crm/chess",
						label: "Шахматка",
						icon: Grid3X3,
					},
				],
			},
		],
	},
	{
		id: "warehouse",
		label: "Закуп / Снабжение",
		shortLabel: "Закуп",
		icon: ShoppingBag,
		color: "#0f766e",
		urlPrefix: ["/warehouse"],
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
					{
						href: "/warehouse/marketplace",
						label: "Маркетплейс",
						icon: Package,
					},
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
				],
			},
			{
				title: "Склад",
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
		],
	},
	{
		id: "consolidated",
		label: "Сводное",
		shortLabel: "Сводное",
		icon: Globe,
		color: "#6b7280",
		urlPrefix: [
			"/dashboard",
			"/counterparties",
			"/properties",
			"/users",
			"/settings",
			"/design-system",
			"/import",
			"/activity",
			"/companies",
			"/reports",
		],
		sections: [
			{
				title: "Главная",
				items: [
					{ href: "/dashboard?tab=control", label: "Обзор", icon: LayoutDashboard },
					{ href: "/properties", label: "Объекты", icon: Building2 },
					{
						href: "/properties/chess",
						label: "Шахматка объектов",
						icon: Grid3X3,
					},
					{ href: "/counterparties", label: "Все контрагенты", icon: Users },
					{ href: "/companies", label: "Компании", icon: Building },
					{ href: "/users", label: "Пользователи", icon: UserCircle },
					{
						href: "/design-system",
						label: "Дизайн-система",
						icon: Layers,
					},
				],
			},
			{
				title: "Отчёты",
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
					{ href: "/reports/rental", label: "Сводка аренды", icon: BarChart2 },
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
	if (mod.id === "consolidated") {
		return "/dashboard?tab=control";
	}
	for (const section of mod.sections) {
		for (const item of section.items) {
			if (!item.href.startsWith("/dashboard")) {
				return item.href;
			}
		}
	}
	return mod.sections[0]?.items[0]?.href || "/dashboard";
}

function detectModule(path: string): ModuleId {
	return detectModuleFromPath(path);
}

interface SectionGroupProps {
	section: NavSection;
	location: string;
	moduleId: ModuleId;
	role: string;
	permissions: string[];
	allowedModules: ModuleId[];
	open: boolean;
	onToggle: () => void;
	collapsed?: boolean;
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
	onToggle,
	collapsed = false,
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

	if (collapsed) {
		return (
			<div className="space-y-1">
				{items.map((item) => {
					const active = bestMatch?.href === item.href;
					const Icon = item.icon;
					return (
						<Link key={item.href} href={item.href}>
							<div
								title={`${section.title}: ${item.label}`}
								className={cn(
									"mx-auto flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
									active
										? "bg-cyan-500 text-white shadow-lg shadow-cyan-950/25"
										: "text-white/45 hover:bg-white/10 hover:text-white",
								)}
							>
								<Icon className="h-4 w-4" />
							</div>
						</Link>
					);
				})}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-2xl border transition-all duration-200",
				open
					? "border-cyan-400/18 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
					: "border-transparent",
			)}
		>
			<button
				onClick={onToggle}
				className={cn(
					"w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
					open || isActiveSection
						? "text-cyan-100"
						: "text-white/35 hover:text-white/65",
				)}
			>
				<span className="truncate">{section.title}</span>
				{open ? (
					<ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
				) : (
					<ChevronRight className="w-3.5 h-3.5 text-white/30" />
				)}
			</button>
			{open && (
				<div className="space-y-1 px-2 pb-2">
					{items.map((item) => {
						// Only mark as active if this is the most specific match
						const active = bestMatch?.href === item.href;
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<div
									className={cn(
										"flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] cursor-pointer transition-all duration-150 group",
										active
											? "bg-cyan-500 text-white shadow-lg shadow-cyan-950/20"
											: "text-white/58 hover:text-white hover:bg-white/[0.075]",
									)}
								>
									<Icon
										className={cn(
											"w-3.5 h-3.5 flex-shrink-0",
											active
												? "text-white"
												: "text-white/35 group-hover:text-cyan-200",
										)}
									/>
									<span className="truncate">{item.label}</span>
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
	const [modulePickerOpen, setModulePickerOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [sidebarPinned, setSidebarPinned] = useState(
		() => localStorage.getItem("planalityc_sidebar_pinned") === "1",
	);
	const [openSectionTitle, setOpenSectionTitle] = useState<string | null>(null);
	const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
	useFinanceHotkeys(!!user);
	const modulePickerRef = useRef<HTMLDivElement>(null);
	const createRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		localStorage.setItem("planalityc_sidebar_pinned", sidebarPinned ? "1" : "0");
	}, [sidebarPinned]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				modulePickerRef.current &&
				!modulePickerRef.current.contains(e.target as Node)
			) {
				setModulePickerOpen(false);
			}
			if (createRef.current && !createRef.current.contains(e.target as Node)) {
				setCreateOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const visibleModules = MODULES.filter((m) =>
		allowedModules.includes(m.id),
	);

	useEffect(() => {
		if (accessLoading || !user) return;
		if (!canAccess(pathWithSearch)) {
			setLocation(homePath);
		}
	}, [accessLoading, user, pathWithSearch, canAccess, homePath, setLocation]);

	const activeModuleId = detectModule(pathWithSearch);
	const activeModule =
		visibleModules.find((m) => m.id === activeModuleId) ||
		visibleModules[0] ||
		MODULES.find((m) => m.id === activeModuleId) ||
		MODULES[MODULES.length - 1];
	const ModuleIcon = activeModule.icon;
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
	const sidebarCollapsed = !sidebarPinned;
	const showModuleSwitcher = visibleModules.length > 1;
	const adminRoles = new Set(["company_admin", "admin", "super_admin"]);
	const isAdminUser = adminRoles.has(String((user as { role?: string })?.role ?? role));

	const navSections = useMemo(() => {
		const userRole = (user as { role?: string })?.role;
		const isPtoRole = userRole === "pto" || userRole === "engineer";
		let sections = activeModule.sections;
		if (isPtoRole && activeModule.id === "construction") {
			sections = sections.filter((s) =>
				["Главный поток", "Себестоимость"].includes(s.title),
			);
		}
		if (!isAdminUser) {
			sections = sections.filter(
				(s) => !["AI-Инструменты", "AI и документы"].includes(s.title),
			);
		}
		return sections;
	}, [activeModule, user, isAdminUser]);

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
		setOpenSectionTitle(activeSection?.title ?? navSections[0]?.title ?? null);
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
	}, [pathWithSearch]);

	return (
		<div
			className="flex h-screen overflow-hidden"
			style={{ background: "#F5F8FA" }}
		>
			{mobileNavOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/40 md:hidden"
					aria-label="Закрыть меню"
					onClick={() => setMobileNavOpen(false)}
				/>
			)}

			<CommandPalette
				open={commandOpen}
				onOpenChange={setCommandOpen}
				items={commandItems}
			/>

			{/* ───── SIDEBAR ───── */}
			<aside
				className={cn(
					"flex-shrink-0 flex flex-col overflow-hidden z-50",
					"fixed md:relative inset-y-0 left-0 transition-transform duration-200",
					sidebarCollapsed ? "md:w-[72px]" : "md:w-[244px]",
					"w-[244px]",
					mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
				)}
				style={{
					background:
						"radial-gradient(circle at 20% 0%, rgba(14,165,233,0.22), transparent 26%), radial-gradient(circle at 100% 24%, rgba(20,184,166,0.15), transparent 30%), linear-gradient(180deg, #030A12 0%, #071827 46%, #08131E 100%)",
				}}
			>
				{/* Logo */}
				<div
					className={cn(
						"border-b border-white/8",
						sidebarCollapsed ? "px-3 py-4" : "px-4 py-4",
					)}
				>
					<div className={cn("flex items-center", sidebarCollapsed ? "flex-col justify-center gap-2" : "justify-between gap-2")}>
						<PlanalitycLogo
							variant={sidebarCollapsed ? "mark" : "sidebar"}
							className={sidebarCollapsed ? "h-9 w-9" : undefined}
						/>
						<button
							type="button"
							onClick={() => setSidebarPinned((p) => !p)}
							title={sidebarPinned ? "Свернуть меню" : "Закрепить меню"}
							className={cn(
								"hidden h-8 w-8 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white md:flex",
								sidebarCollapsed && "h-7 w-7 bg-white/5",
							)}
						>
							{sidebarPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
						</button>
					</div>
				</div>

				{/* Nav */}
				<nav
					className="flex-1 overflow-y-auto py-3 px-3 space-y-2.5 scrollbar-thin"
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
							open={openSectionTitle === section.title}
							collapsed={sidebarCollapsed}
							onToggle={() =>
								setOpenSectionTitle((current) =>
									current === section.title ? null : section.title,
								)
							}
						/>
					))}
				</nav>

				{/* Quick create — отдельная панель, чтобы не путать с разделами меню */}
				{showQuickCreate && (
					<div className={cn("px-3 pb-3 pt-2 border-t border-white/8", sidebarCollapsed && "hidden md:block")}>
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
							className="rounded-2xl px-2.5 py-3 border border-cyan-400/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
				<header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0 relative z-50 shadow-sm">
					<button
						type="button"
						className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Открыть меню"
						onClick={() => setMobileNavOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</button>

					{/* Module switcher */}
					{showModuleSwitcher ? (
						<div
							className="relative flex-shrink-0"
							ref={modulePickerRef}
							onMouseEnter={() => setModulePickerOpen(true)}
							onMouseLeave={() => setModulePickerOpen(false)}
							onFocus={() => setModulePickerOpen(true)}
						>
							<button
								onClick={() => setModulePickerOpen((o) => !o)}
								className="flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 bg-white transition-all whitespace-nowrap"
							>
								<ModuleIcon
									className="w-4 h-4 flex-shrink-0"
									style={{ color: activeModule.color }}
								/>
								<span>{activeModule.shortLabel}</span>
								<ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
							</button>
							<div className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner">
								{visibleModules.map((m) => {
									const Icon = m.icon;
									const active = m.id === activeModule.id;
									return (
										<Link key={m.id} href={getModuleEntryHref(m)}>
											<div
												className={cn(
													"group flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all",
													active
														? "min-w-[124px] gap-2 bg-slate-950 px-3 text-white shadow-sm"
														: "w-10 text-slate-500 hover:bg-white hover:text-slate-950",
												)}
												title={m.label}
											>
												<Icon
													className="h-4 w-4 flex-shrink-0"
													style={{ color: active ? "#67e8f9" : m.color }}
												/>
												{active && <span className="truncate">{m.shortLabel}</span>}
											</div>
										</Link>
									);
								})}
							</div>
							{modulePickerOpen && (
								<div
									className="absolute top-full left-0 mt-2 w-[280px] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/16 backdrop-blur"
									style={{ zIndex: 9999 }}
								>
									{visibleModules.map((m) => {
										const Icon = m.icon;
										const moduleHref = getModuleEntryHref(m);
										return (
											<Link key={m.id} href={moduleHref}>
												<div
													className={cn(
														"flex items-center gap-3 rounded-2xl px-3 py-3 text-sm cursor-pointer transition-all whitespace-nowrap",
														m.id === activeModule.id
															? "bg-slate-950 text-white shadow-sm"
															: "hover:bg-slate-50 text-slate-800",
													)}
													onClick={() => setModulePickerOpen(false)}
												>
													<div
														className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100"
														style={{
															background:
																m.id === activeModule.id
																	? "rgba(255,255,255,0.12)"
																	: `${m.color}14`,
														}}
													>
														<Icon
															className="w-4 h-4 flex-shrink-0"
															style={{
																color:
																	m.id === activeModule.id ? "#67e8f9" : m.color,
															}}
														/>
													</div>
													<div className="min-w-0">
														<div className="truncate font-semibold">{m.label}</div>
														<div
															className={cn(
																"text-xs",
																m.id === activeModule.id
																	? "text-white/45"
																	: "text-slate-400",
															)}
														>
															{m.sections.length} разделов
														</div>
													</div>
												</div>
											</Link>
										);
									})}
								</div>
							)}
						</div>
					) : (
						<div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 whitespace-nowrap">
							<ModuleIcon
								className="w-4 h-4 flex-shrink-0"
								style={{ color: activeModule.color }}
							/>
							<span>{activeModule.shortLabel}</span>
						</div>
					)}

					{/* Search / command palette */}
					<button
						type="button"
						onClick={() => setCommandOpen(true)}
						className="relative hidden min-w-[280px] flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-14 text-left text-sm text-gray-500 transition-all hover:border-gray-300 sm:flex"
					>
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
						<span>Поиск по проектам, контрагентам, договорам…</span>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
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
								className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md whitespace-nowrap bg-cyan-700 hover:bg-cyan-800 shadow-cyan-950/10"
							>
								<Plus className="w-4 h-4" />
								Создать
								<ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
							</button>
							{createOpen && (
								<div
									className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl border border-gray-100 shadow-xl py-1"
									style={{ zIndex: 9999 }}
								>
									{quickActions.map((qa) => (
										<Link key={qa.href} href={qa.href}>
											<div
												className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
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
					<NotificationBell />
					{/* <NotificationsPanel /> */}

					{/* Messages */}
					<ChatPanel />

					{/* Divider */}
					<div className="w-px h-6 bg-gray-100" />

					{/* User profile */}
					<UserProfileDropdown />
				</header>

				{/* ── CONTENT ── */}
				<main className="flex-1 overflow-y-auto">
					<div className="p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
