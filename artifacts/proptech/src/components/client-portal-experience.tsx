import {
	Bell,
	BookOpen,
	Building2,
	Camera,
	CreditCard,
	Eye,
	FileText,
	Gift,
	Headphones,
	MessageCircle,
	Pencil,
	Phone,
	QrCode,
	ReceiptText,
	Settings,
	Vote,
	Wrench,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	getPortalContentItems,
	isContentVisibleForAudience,
	PORTAL_CONTENT_QUERY_KEY,
	type PortalAudience,
	type PortalContentItem,
	type PortalPlacement,
} from "@/lib/client-portal";
import { cn } from "@/lib/utils";

const quickActions: Array<{ label: string; icon: ElementType; accent?: string }> = [
	{ label: "Оплата", icon: CreditCard },
	{ label: "Заявки", icon: Wrench },
	{ label: "Документы", icon: FileText },
	{ label: "Счётчики", icon: ReceiptText, accent: "NEW" },
	{ label: "Опросы", icon: Vote },
	{ label: "Отчёты", icon: BookOpen },
	{ label: "Камеры ЖК", icon: Camera },
	{ label: "Ещё", icon: QrCode },
];

function byPlacement(items: PortalContentItem[], placement: PortalPlacement) {
	return items.filter((item) => (item.placement ?? "home") === placement);
}

const AUDIENCE_PORTAL: Record<PortalAudience, { name: string; role: string; gradient: string }> = {
	all: { name: "Клиент", role: "Личный кабинет клиента", gradient: "from-cyan-700 to-teal-500" },
	buyers: { name: "Покупатель", role: "Личный кабинет покупателя", gradient: "from-cyan-700 to-teal-500" },
	tenants: { name: "Арендатор", role: "Личный кабинет арендатора", gradient: "from-sky-700 to-blue-500" },
	investors: { name: "Инвестор", role: "Личный кабинет инвестора", gradient: "from-violet-700 to-fuchsia-500" },
	contractors: { name: "Подрядчик", role: "Личный кабинет подрядчика", gradient: "from-amber-600 to-orange-600" },
	suppliers: { name: "Поставщик", role: "Личный кабинет поставщика", gradient: "from-slate-700 to-slate-500" },
};

function EditableWrap({
	editable,
	active,
	status,
	onClick,
	className,
	children,
}: {
	editable?: boolean;
	active?: boolean;
	status?: string;
	onClick?: () => void;
	className?: string;
	children: ReactNode;
}) {
	if (!editable) return <>{children}</>;
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative block w-full rounded-2xl text-left outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-cyan-400",
				active ? "ring-2 ring-cyan-500" : "hover:ring-2 hover:ring-cyan-300",
				className,
			)}
		>
			<span className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
				{status && status !== "published" && (
					<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-sm">
						{status === "archived" ? "Архив" : "Черновик"}
					</span>
				)}
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-cyan-700 opacity-0 shadow-sm transition group-hover:opacity-100">
					<Pencil className="h-3.5 w-3.5" />
				</span>
			</span>
			{children}
		</button>
	);
}

function PortalBanner({
	item,
	variant = "blue",
	editable,
	active,
	onClick,
}: {
	item: PortalContentItem;
	variant?: "blue" | "dark";
	editable?: boolean;
	active?: boolean;
	onClick?: () => void;
}) {
	const bgImage = item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined;
	return (
		<EditableWrap editable={editable} active={active} status={item.status} onClick={onClick}>
			<article
				className={cn(
					"relative min-h-[136px] overflow-hidden rounded-2xl p-4 text-white shadow-sm",
					variant === "dark" ? "bg-gradient-to-r from-slate-950 to-amber-800" : "bg-gradient-to-r from-sky-700 to-cyan-400",
				)}
				style={bgImage}
			>
				<div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 to-transparent" />
				<div className="relative z-10 max-w-[75%]">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
						{item.projectName || "Закрытый клуб"}
					</p>
					<h3 className="mt-2 text-xl font-bold leading-tight">{item.title}</h3>
					<p className="mt-1 line-clamp-2 text-sm opacity-90">{item.body}</p>
					{item.ctaLabel && (
						<span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
							{item.ctaLabel}
						</span>
					)}
				</div>
			</article>
		</EditableWrap>
	);
}

function MiniItem({
	item,
	editable,
	active,
	onClick,
}: {
	item: PortalContentItem;
	editable?: boolean;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<EditableWrap editable={editable} active={active} status={item.status} onClick={onClick}>
			<article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
						<p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.body}</p>
					</div>
					{item.rewardPoints ? (
						<span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
							{item.rewardPoints}
						</span>
					) : null}
				</div>
				{item.priceLabel && (
					<p className="mt-3 font-mono text-sm font-semibold text-gray-950">{item.priceLabel}</p>
				)}
			</article>
		</EditableWrap>
	);
}

export function ClientPortalExperience({
	audience,
	userName,
	projectName = "ОсОО Смарт Эстейт",
	unitLabel = "Квартира №264",
	managerName = "Менеджер объекта",
	editable = false,
	includeDrafts = false,
	activeId = null,
	onSelectItem,
	variant = "mobile",
}: {
	audience: PortalAudience;
	userName?: string;
	projectName?: string;
	unitLabel?: string;
	managerName?: string;
	editable?: boolean;
	includeDrafts?: boolean;
	activeId?: string | null;
	onSelectItem?: (item: PortalContentItem) => void;
	variant?: "mobile" | "desktop";
}) {
	const { data: items = [] } = useQuery({
		queryKey: PORTAL_CONTENT_QUERY_KEY,
		queryFn: () => getPortalContentItems(),
	});

	const visibleItems = useMemo(() => {
		const matchAudience = (item: PortalContentItem) =>
			item.audience === "all" || item.audience === audience;
		const base = includeDrafts
			? items.filter(matchAudience)
			: items.filter((item) => isContentVisibleForAudience(item, audience));
		return base.sort(
			(a, b) =>
				Number(b.pinned) - Number(a.pinned) ||
				new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime(),
		);
	}, [items, audience, includeDrafts]);

	const pick = (item: PortalContentItem) => onSelectItem?.(item);

	const homeItems = byPlacement(visibleItems, "home");
	const myHomeItems = byPlacement(visibleItems, "my_home");
	const serviceItems = byPlacement(visibleItems, "services");
	const clubItems = byPlacement(visibleItems, "club");
	const catalogItems = byPlacement(visibleItems, "catalog");
	const featured = myHomeItems.find((item) => item.type === "construction_update") || null;
	const myHomeCards = myHomeItems.filter((item) => item.id !== featured?.id);
	const bannerItems = featured ? [featured, ...homeItems] : homeItems;
	const renderedIds = new Set([
		...bannerItems.map((i) => i.id),
		...myHomeCards.map((i) => i.id),
		...serviceItems.map((i) => i.id),
		...clubItems.map((i) => i.id),
		...catalogItems.map((i) => i.id),
	]);
	const leftovers = editable ? visibleItems.filter((i) => !renderedIds.has(i.id)) : [];

	if (variant === "desktop") {
		const info = AUDIENCE_PORTAL[audience];
		const panels = [
			{ title: "Мой дом", items: myHomeCards },
			{ title: "Услуги", items: serviceItems },
			{ title: "Закрытый клуб", items: clubItems },
			{ title: "Каталог ЖК", items: catalogItems },
			...(editable ? [{ title: "Прочие блоки", items: leftovers }] : []),
		].filter((p) => p.items.length > 0);
		return (
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#eef2f6] shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 text-white">
							<Building2 className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-bold leading-tight text-gray-900">Planalityc.ai</p>
							<p className="text-[11px] text-gray-500">{info.role}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
							<Eye className="h-3 w-3" />
							Предпросмотр
						</span>
						<span className="text-sm font-medium text-gray-600">{info.name}</span>
					</div>
				</div>

				<div className="space-y-5 p-5 sm:p-6">
					<div className={cn("overflow-hidden rounded-2xl bg-gradient-to-r p-6 text-white shadow-sm sm:p-8", info.gradient)}>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-sm opacity-80">Добро пожаловать,</p>
								<h2 className="mt-1 text-2xl font-bold sm:text-3xl">{info.name}</h2>
								<p className="mt-1 text-sm opacity-75">{info.role}</p>
							</div>
							<div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
								<p className="text-white/70">Материалов в портале</p>
								<p className="mt-1 text-2xl font-bold leading-none">{visibleItems.length}</p>
							</div>
						</div>
					</div>

					<div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
						{quickActions.map((action) => {
							const Icon = action.icon;
							return (
								<div
									key={action.label}
									className="relative flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
								>
									<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
										<Icon className="h-5 w-5 text-sky-700" />
									</span>
									<span className="text-sm font-semibold text-gray-800">{action.label}</span>
									{action.accent && (
										<span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
											{action.accent}
										</span>
									)}
								</div>
							);
						})}
					</div>

					{bannerItems.length > 0 && (
						<div className="grid gap-4 lg:grid-cols-2">
							{bannerItems.map((item, index) => (
								<PortalBanner
									key={item.id}
									item={item}
									variant={index % 2 === 1 ? "dark" : "blue"}
									editable={editable}
									active={activeId === item.id}
									onClick={() => pick(item)}
								/>
							))}
						</div>
					)}

					{panels.length > 0 && (
						<div className="grid gap-5 lg:grid-cols-2">
							{panels.map((panel) => (
								<div key={panel.title} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
									<div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
										<h3 className="font-semibold text-gray-900">{panel.title}</h3>
										<span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 shadow-sm">
											{panel.items.length}
										</span>
									</div>
									<div className="grid gap-3 p-4 sm:grid-cols-2">
										{panel.items.map((item) => (
											<MiniItem
												key={item.id}
												item={item}
												editable={editable}
												active={activeId === item.id}
												onClick={() => pick(item)}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					)}

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
									<Headphones className="h-5 w-5 text-emerald-700" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Ваш менеджер объекта</p>
									<p className="font-semibold text-gray-950">{managerName}</p>
								</div>
							</div>
							<ButtonCircle icon={Phone} tone="green" />
						</div>
						<div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
									<MessageCircle className="h-5 w-5 text-blue-700" />
								</div>
								<div>
									<p className="text-xs text-gray-500">Коммуникации</p>
									<p className="font-semibold text-gray-950">Чат дома и объявления</p>
								</div>
							</div>
							<ButtonCircle icon={MessageCircle} tone="blue" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<section className="space-y-4">
			<div className="overflow-hidden rounded-3xl border border-gray-100 bg-[#f5f7fa] p-4 shadow-sm">
				<div className="mb-4 flex items-center justify-between gap-3">
					<div>
						<p className="text-xs text-gray-500">Портал клиента</p>
						<h2 className="text-2xl font-bold text-gray-950">Мой дом</h2>
					</div>
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm">
							№ 264
						</span>
						<span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
							<Bell className="h-4 w-4 text-gray-600" />
						</span>
					</div>
				</div>

				<div className="mb-4 grid grid-cols-[minmax(0,1fr)_58px] gap-3">
					<div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
							<Building2 className="h-5 w-5 text-sky-700" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-xs text-gray-500">{projectName}</p>
							<p className="truncate text-sm font-bold text-gray-950">{unitLabel}</p>
						</div>
					</div>
					<div className="flex items-center justify-center rounded-2xl bg-white shadow-sm">
						<Settings className="h-6 w-6 text-sky-700" />
					</div>
				</div>

				<div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-white shadow-sm">
					{quickActions.map((action) => {
						const Icon = action.icon;
						return (
							<button
								key={action.label}
								type="button"
								className="relative flex min-h-[82px] flex-col items-center justify-center gap-2 border-b border-r border-gray-100 p-2 text-center last:border-r-0"
							>
								<Icon className="h-6 w-6 text-sky-700" />
								<span className="text-xs font-semibold text-gray-800">{action.label}</span>
								{action.accent && (
									<span className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
										{action.accent}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{bannerItems.map((item, index) => (
				<PortalBanner
					key={item.id}
					item={item}
					variant={index % 2 === 1 ? "dark" : "blue"}
					editable={editable}
					active={activeId === item.id}
					onClick={() => pick(item)}
				/>
			))}

			{myHomeCards.length > 0 && (
				<div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-lg font-bold text-gray-950">Мой дом</h3>
						<span className="text-sm font-semibold text-sky-700">Все</span>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						{myHomeCards.map((item) => (
							<MiniItem
								key={item.id}
								item={item}
								editable={editable}
								active={activeId === item.id}
								onClick={() => pick(item)}
							/>
						))}
					</div>
				</div>
			)}

			<div className="grid gap-3 md:grid-cols-2">
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
							<Headphones className="h-5 w-5 text-emerald-700" />
						</div>
						<div>
							<p className="text-xs text-gray-500">Ваш менеджер объекта</p>
							<p className="font-semibold text-gray-950">{managerName}</p>
						</div>
					</div>
					<ButtonCircle icon={Phone} tone="green" />
				</div>
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
							<MessageCircle className="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<p className="text-xs text-gray-500">Коммуникации</p>
							<p className="font-semibold text-gray-950">Чат дома и объявления</p>
						</div>
					</div>
					<ButtonCircle icon={MessageCircle} tone="blue" />
				</div>
			</div>

			{serviceItems.length > 0 && (
				<div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-lg font-bold text-gray-950">Услуги</h3>
						<span className="text-sm font-semibold text-sky-700">Все</span>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{serviceItems.slice(0, 6).map((item) => (
							<MiniItem
								key={item.id}
								item={item}
								editable={editable}
								active={activeId === item.id}
								onClick={() => pick(item)}
							/>
						))}
					</div>
				</div>
			)}

			{clubItems.length > 0 && (
				<div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-slate-950 to-amber-800 p-4 text-white shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<p className="text-xs uppercase tracking-[0.18em] text-white/60">Club</p>
							<h3 className="text-xl font-bold">Planalityc Platinum</h3>
							<p className="text-sm text-white/75">Добро пожаловать, {userName || "клиент"}</p>
						</div>
						<div className="rounded-full bg-white/15 px-3 py-1.5 font-mono font-bold">
							{clubItems.reduce((sum, item) => sum + Number(item.rewardPoints || 0), 0)}
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						{clubItems.slice(0, 4).map((item) => {
							const row = (
								<div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-3">
									<div className="flex items-center gap-3">
										<Gift className="h-5 w-5 text-amber-200" />
										<div>
											<p className="text-sm font-semibold">{item.title}</p>
											<p className="text-xs text-white/60">{item.body}</p>
										</div>
									</div>
									<span className="font-mono font-bold">{item.rewardPoints || 0}</span>
								</div>
							);
							return editable ? (
								<button
									key={item.id}
									type="button"
									onClick={() => pick(item)}
									className={cn(
										"block w-full rounded-2xl text-left ring-offset-2 ring-offset-slate-900 transition",
										activeId === item.id ? "ring-2 ring-cyan-400" : "hover:ring-2 hover:ring-cyan-400/60",
									)}
								>
									{row}
								</button>
							) : (
								<div key={item.id}>{row}</div>
							);
						})}
					</div>
				</div>
			)}

			{catalogItems.length > 0 && (
				<div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-lg font-bold text-gray-950">Каталог ЖК</h3>
						<span className="text-sm font-semibold text-sky-700">Все</span>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{catalogItems.slice(0, 6).map((item) => (
							<MiniItem
								key={item.id}
								item={item}
								editable={editable}
								active={activeId === item.id}
								onClick={() => pick(item)}
							/>
						))}
					</div>
				</div>
			)}

			{leftovers.length > 0 && (
				<div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-sm font-bold text-gray-700">Прочие блоки</h3>
						<span className="text-xs text-gray-400">видны только в редакторе</span>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{leftovers.map((item) => (
							<MiniItem
								key={item.id}
								item={item}
								editable={editable}
								active={activeId === item.id}
								onClick={() => pick(item)}
							/>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

function ButtonCircle({ icon: Icon, tone }: { icon: ElementType; tone: "green" | "blue" }) {
	return (
		<span
			className={cn(
				"flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white",
				tone === "green" ? "bg-emerald-500" : "bg-blue-600",
			)}
		>
			<Icon className="h-5 w-5" />
		</span>
	);
}
