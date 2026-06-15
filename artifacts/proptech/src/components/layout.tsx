import {
	Activity,
	AlertTriangle,
	ArrowRightLeft,
	BarChart,
	BarChart3,
	Banknote,
	Bell,
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
	PieChart,
	PiggyBank,
	Pin,
	PinOff,
	Plus,
	Receipt,
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
import { type ModuleId } from "@/lib/module-access";
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
	id: string;         // unique visual nav id
	accessId: ModuleId; // maps to access-control system
	label: string;
	shortLabel: string;
	icon: React.ElementType;
	color: string;
	urlPrefix: string[];
	sections: NavSection[];
}

const MODULES: Module[] = [
	// ── 1. Дашборд ──────────────────────────────────────────────────────
	{
		id: "dashboard",
		accessId: "consolidated",
		label: "Дашборд",
		shortLabel: "Дашборд",
		icon: LayoutDashboard,
		color: "#64748b",
		urlPrefix: ["/dashboard", "/activity"],
		sections: [
			{
				title: "Сводка",
				items: [
					{ href: "/dashboard?tab=control", label: "Все проекты", icon: Home },
					{ href: "/dashboard?tab=analytics", label: "Ключевые KPI", icon: TrendingUp },
					{ href: "/activity", label: "Уведомления", icon: Bell },
				],
			},
			{
				title: "Согласования",
				items: [
					{ href: "/construction/planning/approvals", label: "Очередь утверждений", icon: CheckSquare },
					{ href: "/construction/tasks", label: "Мои задачи", icon: ClipboardList },
				],
			},
			{
				title: "Отчёты",
				items: [
					{ href: "/reports/cashflow", label: "Сводный ДДС", icon: BarChart3 },
					{ href: "/reports/payments", label: "Динамика продаж", icon: Activity },
					{ href: "/reports/directions", label: "Все отчёты", icon: PieChart },
				],
			},
		],
	},

	// ── 2. Проекты ──────────────────────────────────────────────────────
	{
		id: "projects",
		accessId: "construction",
		label: "Проекты",
		shortLabel: "Проекты",
		icon: Building2,
		color: "#0ea5e9",
		urlPrefix: ["/construction/projects", "/construction/chess", "/construction/photo-gallery", "/construction/reconciliation"],
		sections: [
			{
				title: "Объект",
				items: [
					{ href: "/construction/projects", label: "Список ЖК", icon: ListOrdered },
					{ href: "/construction/chess", label: "Шахматка", icon: Grid3X3 },
					{ href: "/construction/photo-gallery", label: "Документы", icon: FileText },
				],
			},
			{
				title: "Цены",
				items: [
					{ href: "/construction/chess?mode=prices", label: "Прайс-лист", icon: Target },
					{ href: "/construction/chess?mode=prices", label: "Управление ценами", icon: Receipt },
					{ href: "/construction/chess?mode=publish", label: "Открыть продажи", icon: CheckSquare },
				],
			},
			{
				title: "Сверка ПТО + продажи",
				items: [
					{ href: "/construction/reconciliation", label: "Акт сверки площадей", icon: Scale },
					{ href: "/construction/photo-gallery", label: "Вложения к юниту", icon: FileText },
				],
			},
		],
	},

	// ── 3. CRM / Продажи ────────────────────────────────────────────────
	{
		id: "crm",
		accessId: "proptech",
		label: "CRM",
		shortLabel: "CRM",
		icon: Target,
		color: "#2563eb",
		urlPrefix: ["/crm", "/proptech"],
		sections: [
			{
				title: "Воронка",
				items: [
					{ href: "/crm/leads", label: "Лиды", icon: Target },
					{ href: "/crm/deals", label: "Сделки", icon: ArrowRightLeft },
					{ href: "/crm/clients", label: "Клиенты", icon: Users },
				],
			},
			{
				title: "Объекты",
				items: [
					{ href: "/crm/chess", label: "Шахматка продаж", icon: Grid3X3 },
					{ href: "/crm/sales-properties", label: "Свободные", icon: Home },
				],
			},
			{
				title: "Договоры",
				items: [
					{ href: "/crm/contracts-sales", label: "Создать договор", icon: FileText },
					{ href: "/crm/sales-contracts", label: "Реестр договоров", icon: ScrollText },
					{ href: "/legal", label: "На проверке", icon: Calendar },
				],
			},
			{
				title: "Платежи",
				items: [
					{ href: "/construction/planning/forecast", label: "Графики платежей", icon: Calendar },
					{ href: "/construction/planning/overdue", label: "Просрочки", icon: AlertTriangle },
				],
			},
		],
	},

	// ── 4. ПТО / Строительство ──────────────────────────────────────────
	{
		id: "pto",
		accessId: "construction",
		label: "ПТО",
		shortLabel: "ПТО",
		icon: HardHat,
		color: "#0284c7",
		urlPrefix: [
			"/construction/stages", "/construction/tasks", "/construction/workers",
			"/construction/contractors", "/construction/materials",
			"/construction/planning", "/construction/employees",
			"/construction/counterparties", "/construction/settings",
			"/construction/help", "/construction/reports",
		],
		sections: [
			{
				title: "Планирование",
				items: [
					{ href: "/construction/stages", label: "Этапы WBS", icon: Flag },
					{ href: "/construction/tasks", label: "Задачи", icon: ClipboardList },
					{ href: "/construction/stages?view=gantt", label: "Gantt", icon: BarChart3 },
				],
			},
			{
				title: "Производство",
				items: [
					{ href: "/construction/workers", label: "Бригады", icon: Hammer },
					{ href: "/construction/tasks", label: "Журнал работ", icon: ClipboardList },
					{ href: "/construction/photo-gallery", label: "Фото-отчёты", icon: Map },
				],
			},
			{
				title: "Документы",
				items: [
					{ href: "/construction/reconciliation", label: "Акт сверки площадей", icon: Scale },
					{ href: "/construction/reports", label: "КС-2 / КС-3", icon: FileText },
				],
			},
			{
				title: "Подрядчики",
				items: [
					{ href: "/construction/contractors", label: "Реестр", icon: Building },
					{ href: "/contractor-portal", label: "Портал подрядчика", icon: Globe },
				],
			},
		],
	},

	// ── 5. Юрист ────────────────────────────────────────────────────────
	{
		id: "legal",
		accessId: "consolidated",
		label: "Юрист",
		shortLabel: "Юрист",
		icon: Scale,
		color: "#7c3aed",
		urlPrefix: ["/legal"],
		sections: [
			{
				title: "Очередь",
				items: [
					{ href: "/legal", label: "На согласовании", icon: CheckSquare },
					{ href: "/legal/registry", label: "Утверждённые", icon: CheckSquare },
					{ href: "/legal/claims", label: "Претензии / возврат", icon: ArrowRightLeft },
				],
			},
			{
				title: "Реестр",
				items: [
					{ href: "/legal/registry", label: "Все договоры", icon: ScrollText },
					{ href: "/legal/court", label: "Судебные дела", icon: Briefcase },
				],
			},
			{
				title: "Шаблоны",
				items: [
					{ href: "/legal/templates", label: "Шаблоны договоров", icon: FileText },
				],
			},
		],
	},

	// ── 6. Финансы ──────────────────────────────────────────────────────
	{
		id: "finance",
		accessId: "finance",
		label: "Финансы",
		shortLabel: "Финансы",
		icon: Wallet,
		color: "#0891b2",
		urlPrefix: [
			"/construction/accounts", "/construction/accruals", "/construction/cashier",
			"/construction/payroll", "/construction/analytics",
			"/reports/cashflow", "/reports/payments", "/reports/debt", "/reports/directions",
		],
		sections: [
			{
				title: "Операции",
				items: [
					{ href: "/dashboard?tab=finance", label: "Обзор", icon: LayoutDashboard },
					{ href: "/construction/cashier", label: "Приём платежей", icon: DollarSign },
					{ href: "/construction/operations", label: "Расходы", icon: Receipt },
					{ href: "/construction/payroll", label: "Зарплатная ведомость", icon: Banknote },
				],
			},
			{
				title: "Бюджет",
				items: [
					{ href: "/construction/accounts", label: "Счета", icon: Landmark },
					{ href: "/construction/budget", label: "Бюджет проекта", icon: Wallet },
					{ href: "/construction/planning/forecast", label: "Прогноз", icon: Calendar },
					{ href: "/construction/planning/overdue", label: "Просрочки", icon: AlertTriangle },
					{ href: "/construction/accruals", label: "Начисления", icon: ListOrdered },
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/construction/analytics/cashflow", label: "ОДДС", icon: BarChart3 },
					{ href: "/construction/analytics/pnl", label: "ОПУ", icon: LineChart },
					{ href: "/construction/analytics/expenses", label: "Себестоимость", icon: PieChart },
				],
			},
		],
	},

	// ── 7. Аренда ───────────────────────────────────────────────────────
	{
		id: "rental",
		accessId: "rental",
		label: "Аренда",
		shortLabel: "Аренда",
		icon: Home,
		color: "#14b8a6",
		urlPrefix: ["/rental"],
		sections: [
			{
				title: "Управление",
				items: [
					{ href: "/rental/properties", label: "Объекты аренды", icon: Building2 },
					{ href: "/rental/tenants", label: "Арендаторы", icon: UserCircle },
					{ href: "/rental/contracts", label: "Договоры аренды", icon: FileText },
					{ href: "/rental/deposits", label: "Депозиты", icon: PiggyBank },
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/rental/accruals", label: "Начисление", icon: ListOrdered },
					{ href: "/rental/payments", label: "Платежи", icon: CreditCard },
					{ href: "/rental/analytics/debt", label: "Долги", icon: AlertTriangle },
					{ href: "/rental/statements", label: "Акты собственников", icon: ScrollText },
				],
			},
			{
				title: "Владельцы",
				items: [
					{ href: "/rental/investors", label: "Инвесторы", icon: Coins },
					{ href: "/rental/distributions", label: "Распределение дохода", icon: Coins },
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/rental/analytics/odds", label: "ОДДС", icon: BarChart3 },
					{ href: "/rental/analytics/opu", label: "ОПУ", icon: LineChart },
					{ href: "/rental/analytics/summary", label: "Загрузка объектов", icon: BarChart },
				],
			},
			{
				title: "Планирование",
				items: [
					{ href: "/rental/planning/forecast", label: "Будущие поступления", icon: Calendar },
					{ href: "/rental/planning/overdue", label: "Окончание договоров", icon: Calendar },
				],
			},
		],
	},

	// ── 8. Снабжение ────────────────────────────────────────────────────
	{
		id: "warehouse",
		accessId: "warehouse",
		label: "Снабжение",
		shortLabel: "Снабж.",
		icon: ShoppingBag,
		color: "#0f766e",
		urlPrefix: ["/warehouse"],
		sections: [
			{
				title: "Заявки",
				items: [
					{ href: "/warehouse/requests", label: "Заявки прорабов", icon: Target },
					{ href: "/warehouse/approvals", label: "Согласование", icon: ShieldCheck },
					{ href: "/warehouse/orders", label: "В пути", icon: Truck },
				],
			},
			{
				title: "Склад",
				items: [
					{ href: "/warehouse/incoming", label: "Приход", icon: Truck },
					{ href: "/warehouse/outgoing", label: "Расход / выдача", icon: Layers },
					{ href: "/warehouse/inventory", label: "Инвентаризация", icon: Scale },
				],
			},
			{
				title: "Маркетплейс",
				items: [
					{ href: "/warehouse/marketplace", label: "Маркетплейс", icon: Package },
					{ href: "/warehouse/suppliers", label: "Поставщики", icon: Building },
					{ href: "/warehouse/orders", label: "Счета и оплата", icon: Receipt },
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/warehouse/costs", label: "Стоимость запасов", icon: Wallet },
					{ href: "/warehouse/reports", label: "Отчёты", icon: BarChart },
				],
			},
		],
	},

	// ── 9. AI-инструменты ───────────────────────────────────────────────
	{
		id: "ai",
		accessId: "ai",
		label: "AI",
		shortLabel: "AI",
		icon: Zap,
		color: "#7c3aed",
		urlPrefix: ["/construction/ai"],
		sections: [
			{
				title: "Документы и сметы",
				items: [
					{ href: "/construction/ai/estimates", label: "AI Смета", icon: BarChart3 },
					{ href: "/construction/ai/snip-check", label: "Проверка СНиП", icon: ShieldCheck },
					{ href: "/construction/ai/tools", label: "Генерация договора", icon: FileText },
					{ href: "/construction/ai/tools", label: "Распознать КС-2", icon: Search },
				],
			},
			{
				title: "Аналитика",
				items: [
					{ href: "/construction/ai/contractor-analytics", label: "Анализ подрядчиков", icon: BarChart3 },
					{ href: "/construction/ai/photo-report", label: "Анализ фото стройки", icon: Search },
					{ href: "/dashboard?tab=analytics", label: "Прогноз продаж", icon: TrendingUp },
				],
			},
			{
				title: "Ассистент",
				items: [
					{ href: "/construction/ai/chat", label: "Чат по проекту", icon: MessageCircle },
					{ href: "/construction/ai/telegram", label: "Telegram-бот", icon: Send },
				],
			},
		],
	},

	// ── 10. Сводное ─────────────────────────────────────────────────────
	{
		id: "consolidated",
		accessId: "consolidated",
		label: "Сводное",
		shortLabel: "Сводное",
		icon: Globe,
		color: "#6b7280",
		urlPrefix: ["/properties", "/reports", "/counterparties", "/companies", "/consolidated", "/import"],
		sections: [
			{
				title: "Обзор",
				items: [
					{ href: "/dashboard?tab=control", label: "Мультипроект", icon: LayoutDashboard },
					{ href: "/properties", label: "Все объекты", icon: Building2 },
					{ href: "/companies", label: "Все компании", icon: Users },
				],
			},
			{
				title: "Финансы",
				items: [
					{ href: "/reports/cashflow", label: "Сводный ДДС", icon: BarChart3 },
					{ href: "/construction/analytics/pnl", label: "Сводный ОПУ", icon: FileText },
					{ href: "/reports/directions", label: "Инвест. портфель", icon: PieChart },
				],
			},
			{
				title: "Контрагенты",
				items: [
					{ href: "/counterparties", label: "Единый реестр", icon: Users },
					{ href: "/crm/sales-contracts", label: "Все договоры", icon: FileText },
				],
			},
		],
	},

	// ── 11. Порталы ─────────────────────────────────────────────────────
	{
		id: "portals",
		accessId: "proptech",
		label: "Порталы",
		shortLabel: "Порталы",
		icon: Globe,
		color: "#0891b2",
		urlPrefix: ["/portals"],
		sections: [
			{
				title: "Типы порталов",
				items: [
					{ href: "/portals", label: "Обзор", icon: LayoutDashboard },
					{ href: "/portals/buyer", label: "Покупатель", icon: Home },
					{ href: "/portals/contractor", label: "Подрядчик", icon: Building },
					{ href: "/portals/investor", label: "Инвестор", icon: Coins },
					{ href: "/portals/tenant", label: "Арендатор", icon: Home },
				],
			},
			{
				title: "Управление",
				items: [
					{ href: "/portals/invites", label: "Пригласить", icon: Send },
					{ href: "/portals/access", label: "Просмотр доступа", icon: Search },
				],
			},
		],
	},

	// ── 12. Админ ───────────────────────────────────────────────────────
	{
		id: "admin",
		accessId: "consolidated",
		label: "Админ",
		shortLabel: "Админ",
		icon: Settings,
		color: "#475569",
		urlPrefix: ["/users", "/settings", "/design-system"],
		sections: [
			{
				title: "Компания",
				items: [
					{ href: "/settings", label: "Профиль компании", icon: Building },
					{ href: "/users", label: "Пригласить пользователей", icon: UserCircle },
				],
			},
			{
				title: "Роли и доступ",
				items: [
					{ href: "/settings/roles", label: "Роли", icon: ShieldCheck },
					{ href: "/settings/roles", label: "Права доступа", icon: ShieldCheck },
				],
			},
			{
				title: "Система",
				items: [
					{ href: "/settings", label: "Настройки", icon: Settings },
					{ href: "/activity", label: "Уведомления", icon: Bell },
				],
			},
		],
	},
];

function getModuleEntryHref(mod: Module): string {
	return mod.sections[0]?.items[0]?.href || "/dashboard";
}

/** Returns the visual module id (string) that best matches the current path. */
function detectVisualModuleId(path: string, modules: Module[]): string {
	// Strip query string for prefix matching
	const cleanPath = path.split("?")[0];
	if (cleanPath === "/dashboard") {
		const queryIndex = path.indexOf("?");
		const tab = queryIndex === -1 ? null : new URLSearchParams(path.slice(queryIndex + 1)).get("tab");
		const tabToModule: Record<string, string> = {
			construction: "pto",
			finance: "finance",
			supply: "warehouse",
			sales: "crm",
			rental: "rental",
			investors: "rental",
			analytics: "dashboard",
			control: "dashboard",
		};
		const moduleId = tab ? tabToModule[tab] : "dashboard";
		if (moduleId && modules.some((m) => m.id === moduleId)) return moduleId;
		if (modules.some((m) => m.id === "dashboard")) return "dashboard";
	}
	let bestId = modules[0]?.id ?? "dashboard";
	let bestLen = 0;
	for (const m of modules) {
		for (const prefix of m.urlPrefix) {
			if (
				(cleanPath === prefix || cleanPath.startsWith(prefix + "/") || cleanPath.startsWith(prefix + "?")) &&
				prefix.length > bestLen
			) {
				bestLen = prefix.length;
				bestId = m.id;
			}
		}
	}
	return bestId;
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
		supply: "Закуп",
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

	return (
		<div
			title={collapsed ? section.title : undefined}
			className={cn(
				"rounded-[22px] border transition-all duration-200",
				collapsed && "border-transparent",
				open
					? "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
					: "border-transparent",
			)}
		>
			<button
				onClick={onToggle}
				className={cn(
					"w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
					collapsed && "justify-center px-2",
					open || isActiveSection
						? "text-white/82"
						: "text-white/35 hover:text-white/65",
				)}
			>
				{collapsed ? (
					<span className="h-1.5 w-1.5 rounded-full bg-current" />
				) : (
					<span className="truncate">{section.title}</span>
				)}
				{!collapsed && (open ? (
					<ChevronDown className="w-3.5 h-3.5 text-cyan-200/80" />
				) : (
					<ChevronRight className="w-3.5 h-3.5 text-white/30" />
				))}
			</button>
			{open && (
				<div className={cn("space-y-1 px-2 pb-2", collapsed && "px-0")}>
					{items.map((item) => {
						// Only mark as active if this is the most specific match
						const active = bestMatch === item;
						const Icon = item.icon;
						return (
							<Link
								key={`${item.href}-${item.label}`}
								href={item.href}
								className="outline-none focus:outline-none"
							>
								<div
									className={cn(
										"relative flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-[13px] cursor-pointer transition-all duration-150 group",
										collapsed && "justify-center px-2",
										active
											? "border-cyan-200/20 bg-white/[0.105] text-white shadow-[0_12px_30px_-24px_rgba(34,211,238,0.8)]"
											: "border-transparent text-white/58 hover:border-white/8 hover:bg-white/[0.07] hover:text-white",
									)}
									title={collapsed ? item.label : undefined}
								>
									{active && !collapsed && (
										<span className="absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-300/90" />
									)}
									<Icon
										className={cn(
											"w-3.5 h-3.5 flex-shrink-0",
											active
												? "text-cyan-100"
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
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [sidebarPinned, setSidebarPinned] = useState(
		() => localStorage.getItem("planalityc_sidebar_pinned") === "1",
	);
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [openSectionTitle, setOpenSectionTitle] = useState<string | null>(null);
	const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
	useFinanceHotkeys(!!user);
	const createRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		localStorage.setItem("planalityc_sidebar_pinned", sidebarPinned ? "1" : "0");
	}, [sidebarPinned]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (createRef.current && !createRef.current.contains(e.target as Node)) {
				setCreateOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const allowedVisibleModules = MODULES.filter((m) =>
		allowedModules.includes(m.accessId),
	);
	const businessModules = allowedVisibleModules.filter(
		(m) => !["dashboard", "consolidated", "legal", "admin"].includes(m.id),
	);
	const activeModuleId = detectVisualModuleId(pathWithSearch, allowedVisibleModules);
	const visibleModules =
		businessModules.length <= 1 && activeModuleId !== "consolidated"
			? businessModules
			: allowedVisibleModules;

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
	const quickActions = useMemo(
		() =>
			resolveQuickActions(
				activeModule.accessId,
				role,
				permissions,
				allowedModules,
			),
		[activeModule.accessId, role, permissions, allowedModules],
	);
	const showQuickCreate = quickActions.length > 0;
	const sidebarCollapsed = !sidebarPinned && !sidebarHovered;
	const adminRoles = new Set(["company_admin", "admin", "super_admin"]);
	const isAdminUser = adminRoles.has(String((user as { role?: string })?.role ?? role));

	const navSections = useMemo(() => {
		const userRole = (user as { role?: string })?.role;
		const isPtoRole = userRole === "pto" || userRole === "engineer";
		let sections = activeModule.sections;
		if (isPtoRole && activeModule.id === "pto") {
			// ПТО видит только строительные разделы, без "Себестоимость"
			sections = sections.filter((s) =>
				["Проект", "Планирование", "Производство"].includes(s.title),
			);
		}
		if (!isAdminUser) {
			// Дизайн-система — только для администраторов
			sections = sections.map((s) => ({
				...s,
				items: s.items.filter((item) => item.href !== "/design-system"),
			}));
		}
		return sections;
	}, [activeModule, user, isAdminUser]);

	useEffect(() => {
		const activeSection = navSections.find((section) =>
			section.items.some((item) => {
				const href = resolveNavItemHref(
					item,
					activeModule.accessId,
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
						mod.accessId,
						role,
						permissions,
						allowedModules,
					);
					items.push({
						id: `${mod.id}-${section.title}-${item.label}-${item.href}`,
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
				onMouseEnter={() => setSidebarHovered(true)}
				onMouseLeave={() => setSidebarHovered(false)}
				className={cn(
					"flex-shrink-0 flex flex-row overflow-hidden z-50",
					"fixed md:relative inset-y-0 left-0 transition-all duration-200",
					sidebarCollapsed ? "md:w-[86px]" : "md:w-[292px]",
					"w-[292px] max-w-[88vw]",
					mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
				)}
				style={{
					background:
						"radial-gradient(circle at 20% 0%, rgba(34,211,238,0.28), transparent 28%), radial-gradient(circle at 105% 18%, rgba(16,185,129,0.18), transparent 30%), linear-gradient(145deg, #020617 0%, #062032 46%, #07111f 100%)",
				}}
			>
				{/* ── LEFT STRIP: module icons ── */}
				<div className="flex flex-col w-[86px] flex-shrink-0 border-r border-white/8">
					{/* Logo */}
					<div className="flex items-center justify-center py-4 border-b border-white/8">
						<PlanalitycLogo variant="mark" className="h-9 w-9" />
					</div>

					{/* Module list */}
					<div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1 scrollbar-none">
						{allowedVisibleModules.map((m) => {
							const Icon = m.icon;
							const isActive = m.id === activeModule.id;
							return (
								<Link
									key={m.id}
									href={getModuleEntryHref(m)}
									className="outline-none focus:outline-none"
								>
									<div
										title={m.label}
										className={cn(
											"relative flex flex-col items-center gap-1 w-[74px] py-2.5 px-1.5 rounded-[18px] cursor-pointer transition-all duration-150",
											isActive
												? "bg-white/[0.105] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
												: "text-white/42 hover:text-white/80 hover:bg-white/7",
										)}
									>
										<Icon
											className={cn(
												"w-5 h-5 flex-shrink-0",
												isActive && "drop-shadow-[0_0_8px_rgba(103,232,249,0.7)]",
											)}
											style={{ color: isActive ? "#67e8f9" : m.color }}
										/>
										<span
											className="text-[10px] font-semibold leading-tight text-center w-full"
											style={{ color: isActive ? "#a5f3fc" : undefined }}
										>
											{m.shortLabel}
										</span>
										{isActive && (
											<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
										)}
									</div>
								</Link>
							);
						})}
					</div>

					{/* User avatar */}
					<div className="py-3 flex flex-col items-center gap-2 border-t border-white/8">
						<button
							type="button"
							onClick={() => setSidebarPinned((p) => !p)}
							title={sidebarPinned ? "Свернуть меню" : "Закрепить меню"}
							className="hidden md:flex h-7 w-7 items-center justify-center rounded-xl text-white/35 transition hover:bg-white/10 hover:text-white"
						>
							{sidebarPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
						</button>
						<button
							onClick={logout}
							title="Выйти"
							className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] hover:opacity-80 transition"
							style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)" }}
						>
							{initials}
						</button>
					</div>
				</div>

				{/* ── RIGHT PANEL: submenu ── */}
				{!sidebarCollapsed && (
					<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
						{/* Module header */}
						<div className="flex items-center gap-2 px-3 py-4 border-b border-white/8">
							<ModuleIcon className="w-4 h-4 flex-shrink-0" style={{ color: activeModule.color }} />
							<span className="text-[11px] font-bold uppercase tracking-widest text-white/60 truncate">
								{activeModule.label}
							</span>
						</div>

						{/* Nav sections */}
						<nav
							className="flex-1 overflow-y-auto py-3 px-2 space-y-2 scrollbar-thin"
							style={{ scrollbarColor: "#ffffff12 transparent" }}
						>
							{navSections.map((section) => (
								<SectionGroup
									key={section.title}
									section={section}
									location={pathWithSearch}
									moduleId={activeModule.accessId}
									role={role}
									permissions={permissions}
									allowedModules={allowedModules}
									open={openSectionTitle === section.title}
									collapsed={false}
									onToggle={() =>
										setOpenSectionTitle((current) =>
											current === section.title ? null : section.title,
										)
									}
								/>
							))}
						</nav>

						{/* Quick create */}
						{showQuickCreate && (
							<div className="px-2 pb-3 pt-2 border-t border-white/8">
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
							</div>
						)}

						{/* User info */}
						<div className="px-2 py-3 border-t border-white/8">
							<div className="flex items-center gap-2 px-2 py-2 rounded-2xl hover:bg-white/8 transition-all cursor-pointer group">
								<div
									className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
									style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)" }}
								>
									{initials}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-white text-[12px] font-medium truncate leading-none">
										{displayName}
									</div>
									<div className="text-white/40 text-[10px] truncate mt-0.5">
										{displayEmail}
									</div>
								</div>
								<button
									onClick={logout}
									className="opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<LogOut className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
								</button>
							</div>
						</div>
					</div>
				)}
			</aside>

			{/* ───── MAIN AREA ───── */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* ── TOP HEADER ── */}
				<header className="min-h-16 border-b border-white/70 bg-white/62 backdrop-blur-2xl flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0 relative z-50 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
					<button
						type="button"
						className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
						aria-label="Открыть меню"
						onClick={() => setMobileNavOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</button>

					{/* Current module breadcrumb */}
					<div className="flex items-center gap-2 flex-shrink-0">
						<div
							className="flex h-8 w-8 items-center justify-center rounded-xl"
							style={{ background: `${activeModule.color}18` }}
						>
							<ModuleIcon className="w-4 h-4" style={{ color: activeModule.color }} />
						</div>
						<span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
							{activeModuleShortLabel}
						</span>
					</div>

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
				<main id="main-content" className="flex-1 overflow-y-auto">
					<div className="p-3 sm:p-4 xl:p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
