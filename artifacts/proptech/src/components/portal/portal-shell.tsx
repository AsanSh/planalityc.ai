import { type ElementType, type ReactNode, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = { id: string; label: string; icon: ElementType };

/**
 * Общий каркас порталов в стиле SmartEstate: белый левый сайдбар с текстовым
 * логотипом + тёплая светлая рабочая область, serif-заголовки, зелёный акцент.
 * Навигация переключает секцию внутри страницы (без роутинга).
 */
export function PortalShell({
	brandSub = "Клиентский портал",
	userName,
	isPreview,
	onLogout,
	nav,
	active,
	onNavigate,
	children,
}: {
	brandSub?: string;
	userName?: string;
	isPreview?: boolean;
	onLogout?: () => void;
	nav: PortalNavItem[];
	active: string;
	onNavigate: (id: string) => void;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const activeItem = nav.find((n) => n.id === active);

	const NavList = (
		<nav className="flex-1 space-y-0.5 px-3">
			{nav.map((item) => {
				const Icon = item.icon;
				const isActive = item.id === active;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => {
							onNavigate(item.id);
							setOpen(false);
						}}
						className={cn(
							"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition",
							isActive
								? "bg-gray-100 font-semibold text-slate-900"
								: "text-gray-500 hover:bg-gray-50 hover:text-slate-700",
						)}
					>
						<Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-slate-700" : "text-gray-400")} />
						{item.label}
					</button>
				);
			})}
		</nav>
	);

	const SidebarInner = (
		<div className="flex h-full flex-col gap-5 py-6">
			<div className="px-6">
				<p className="font-serif text-xl font-bold leading-none text-slate-900">SmartEstate</p>
				<p className="mt-1.5 text-xs text-gray-400">{brandSub}</p>
			</div>
			{NavList}
			<div className="mt-auto border-t border-gray-100 px-3 pt-3">
				{userName && (
					<p className="truncate px-3 pb-2 text-xs text-gray-400">
						{isPreview ? "Предпросмотр · " : ""}
						{userName}
					</p>
				)}
				{!isPreview && onLogout && (
					<button
						type="button"
						onClick={onLogout}
						className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-gray-500 transition hover:bg-rose-50 hover:text-rose-600"
					>
						<LogOut className="h-[18px] w-[18px] shrink-0" />
						Выйти
					</button>
				)}
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-[#faf9f7]">
			{/* Мобильная верхняя панель */}
			<div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
				<button type="button" onClick={() => setOpen(true)} className="text-gray-600">
					<Menu className="h-5 w-5" />
				</button>
				<span className="font-serif text-base font-bold text-slate-900">{activeItem?.label}</span>
				<span className="w-5" />
			</div>

			<div className="flex w-full">
				{/* Десктоп-сайдбар */}
				<aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 border-r border-gray-200 bg-white lg:block">
					{SidebarInner}
				</aside>

				{/* Мобильный drawer */}
				{open && (
					<div className="fixed inset-0 z-50 lg:hidden">
						<div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
						<aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="absolute right-3 top-5 text-gray-400"
							>
								<X className="h-5 w-5" />
							</button>
							{SidebarInner}
						</aside>
					</div>
				)}

				<main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
					<div className="mx-auto max-w-[1180px]">{children}</div>
				</main>
			</div>
		</div>
	);
}

/** Serif-заголовок страницы портала (стиль SmartEstate). */
export function PortalPageTitle({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle?: string;
	action?: ReactNode;
}) {
	return (
		<div className="mb-7 flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 className="font-serif text-[30px] font-bold leading-tight text-slate-900">{title}</h1>
				{subtitle && <p className="mt-1.5 text-[15px] text-gray-500">{subtitle}</p>}
			</div>
			{action}
		</div>
	);
}

/** KPI-карточка портала (метка + иконка сверху, крупное значение). */
export function PortalKpi({
	icon: Icon,
	label,
	value,
	sub,
	valueClassName = "text-slate-900",
	subClassName = "text-gray-400",
	extra,
}: {
	icon: ElementType;
	label: string;
	value: string;
	sub?: string;
	valueClassName?: string;
	subClassName?: string;
	extra?: ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">{label}</p>
				<Icon className="h-[18px] w-[18px] text-gray-300" />
			</div>
			<p className={cn("mt-2.5 text-[26px] font-bold leading-none", valueClassName)}>{value}</p>
			{sub && <p className={cn("mt-2 text-xs", subClassName)}>{sub}</p>}
			{extra}
		</div>
	);
}

/** Блок AI-рекомендации (серый, со «спарклом» и обновлением). */
export function PortalAiTip({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-3 rounded-2xl bg-[#f3f3f1] p-5">
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
				<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
					<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" />
				</svg>
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-[15px] font-semibold text-slate-900">AI-рекомендация</p>
				<p className="mt-1 text-sm leading-relaxed text-gray-600">{children}</p>
			</div>
		</div>
	);
}
