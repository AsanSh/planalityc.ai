import { type ElementType, type ReactNode, useState } from "react";
import { Building2, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = { id: string; label: string; icon: ElementType };

/**
 * Общий каркас порталов контрагентов: левый сайдбар (бренд Planalityc / teal)
 * + основная область. Навигация переключает секцию внутри страницы (без роутинга).
 */
export function PortalShell({
	brandSub,
	userName,
	isPreview,
	onLogout,
	nav,
	active,
	onNavigate,
	children,
}: {
	brandSub: string;
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
		<nav className="flex-1 space-y-1 px-3">
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
							"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
							isActive
								? "bg-teal-50 text-teal-800"
								: "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
						)}
					>
						<Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-teal-600" : "text-gray-400")} />
						{item.label}
					</button>
				);
			})}
		</nav>
	);

	const SidebarInner = (
		<div className="flex h-full flex-col gap-4 py-5">
			<div className="flex items-center gap-2.5 px-5">
				<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white">
					<Building2 className="h-5 w-5" />
				</div>
				<div className="min-w-0">
					<p className="truncate text-[15px] font-bold leading-tight text-gray-900">Planalityc.ai</p>
					<p className="truncate text-[11px] text-gray-500">{brandSub}</p>
				</div>
			</div>
			{NavList}
			<div className="mt-auto border-t border-gray-100 px-3 pt-3">
				{userName && (
					<p className="truncate px-3 pb-2 text-xs text-gray-500">
						{isPreview ? "Предпросмотр · " : ""}
						{userName}
					</p>
				)}
				{!isPreview && onLogout && (
					<button
						type="button"
						onClick={onLogout}
						className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-600"
					>
						<LogOut className="h-[18px] w-[18px] shrink-0" />
						Выйти
					</button>
				)}
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-[#f7f8fa]">
			{/* Мобильная верхняя панель */}
			<div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
				<button type="button" onClick={() => setOpen(true)} className="text-gray-600">
					<Menu className="h-5 w-5" />
				</button>
				<span className="text-sm font-semibold text-gray-900">{activeItem?.label}</span>
				<span className="w-5" />
			</div>

			<div className="mx-auto flex w-full max-w-[1440px]">
				{/* Десктоп-сайдбар */}
				<aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
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
								className="absolute right-3 top-4 text-gray-400"
							>
								<X className="h-5 w-5" />
							</button>
							{SidebarInner}
						</aside>
					</div>
				)}

				<main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
			</div>
		</div>
	);
}

/** Заголовок страницы портала. */
export function PortalPageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
	return (
		<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
				{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
			</div>
			{action}
		</div>
	);
}

/** KPI-карточка портала. */
export function PortalKpi({
	icon: Icon,
	label,
	value,
	sub,
	accent = "text-teal-600 bg-teal-50",
}: {
	icon: ElementType;
	label: string;
	value: string;
	sub?: string;
	accent?: string;
}) {
	const [text, bg] = accent.split(" ");
	return (
		<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<p className="text-xs font-medium text-gray-500">{label}</p>
				<span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg)}>
					<Icon className={cn("h-4 w-4", text)} />
				</span>
			</div>
			<p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
			{sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
		</div>
	);
}
