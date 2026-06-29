import {
	Activity,
	Building,
	Calculator,
	CalendarDays,
	CheckSquare,
	ChevronRight,
	Coins,
	Landmark,
	Layers,
	Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export const SYSTEM_SETTINGS_LINKS = [
	{ href: "/settings/legal", label: "Юр. лица", icon: Building, desc: "компании холдинга" },
	{ href: "/settings/accounts", label: "Счета", icon: Landmark, desc: "расчётные и кассы" },
	{ href: "/settings/roles", label: "Роли", icon: CheckSquare, desc: "доступы и права" },
	{ href: "/settings/categories", label: "Статьи операций", icon: Coins, desc: "категории доходов и расходов" },
	{ href: "/settings/periods", label: "Периоды учёта", icon: CalendarDays, desc: "открытие и закрытие" },
	{ href: "/import", label: "Импорт данных", icon: Calculator, desc: "загрузка из Excel" },
	{ href: "/activity", label: "Лог действий", icon: Activity, desc: "история изменений" },
	{ href: "/design-system", label: "Дизайн-система", icon: Layers, desc: "компоненты интерфейса" },
] as const;

export function SystemSettingsBar() {
	const [location] = useLocation();

	return (
		<div className="space-y-3">
			<Link href="/settings">
				<span className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors cursor-pointer">
					<Settings className="w-3.5 h-3.5" />
					Настройки системы
				</span>
			</Link>
			<div className="flex flex-wrap gap-1.5">
				{SYSTEM_SETTINGS_LINKS.map((item) => {
					const active =
						location === item.href || location.startsWith(`${item.href}/`);
					return (
						<Link key={item.href} href={item.href}>
							<span
								className={cn(
									"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
									active
										? "bg-blue-600 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900",
								)}
							>
								<item.icon className="w-3.5 h-3.5" />
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export function SystemSettingsHub() {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
			{SYSTEM_SETTINGS_LINKS.map((item, i) => (
				<Link key={item.href} href={item.href}>
					<div
						className={cn(
							"flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50",
							i > 0 && "border-t border-gray-50",
						)}
					>
						<item.icon className="w-4 h-4 flex-shrink-0 text-cyan-600" />
						<span className="text-sm font-medium text-gray-900">{item.label}</span>
						<span className="truncate text-xs text-gray-400">{item.desc}</span>
						<ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-300" />
					</div>
				</Link>
			))}
		</div>
	);
}
