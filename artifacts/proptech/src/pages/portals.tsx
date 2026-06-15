import {
	Activity,
	Building,
	Copy,
	ExternalLink,
	Home,
	KeyRound,
	Mail,
	Plus,
	Search,
	Send,
	ShieldCheck,
	TrendingUp,
	UserRound,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PortalMode = "overview" | "buyer" | "contractor" | "investor" | "tenant" | "invites" | "access";
type PortalType = "buyer" | "contractor" | "investor" | "tenant";
type AccessStatus = "active" | "invited" | "blocked";

interface PortalAccess {
	id: number;
	type: PortalType;
	name: string;
	email: string;
	object: string;
	lastSeen: string;
	status: AccessStatus;
}

const PORTAL_TYPES: Array<{
	type: PortalType;
	title: string;
	description: string;
	href: string;
	previewHref: string;
	icon: typeof Home;
	tone: string;
}> = [
	{
		type: "buyer",
		title: "Покупатель",
		description: "Квартира, договор, график оплат, документы и ход строительства.",
		href: "/portals/buyer",
		previewHref: "/buyer-portal",
		icon: Home,
		tone: "from-cyan-600 to-blue-600",
	},
	{
		type: "contractor",
		title: "Подрядчик",
		description: "Договор, акты, оплаты, задолженность и история работ.",
		href: "/portals/contractor",
		previewHref: "/contractor-portal",
		icon: Building,
		tone: "from-amber-600 to-orange-600",
	},
	{
		type: "investor",
		title: "Инвестор",
		description: "Инвестиции, доходность, распределение выплат и отчеты.",
		href: "/portals/investor",
		previewHref: "/investor-portal",
		icon: TrendingUp,
		tone: "from-indigo-600 to-violet-600",
	},
	{
		type: "tenant",
		title: "Арендатор",
		description: "Договор аренды, начисления, платежи, акты и задолженность.",
		href: "/portals/tenant",
		previewHref: "/tenant-portal",
		icon: KeyRound,
		tone: "from-teal-600 to-emerald-600",
	},
];

const INITIAL_ACCESS: PortalAccess[] = [
	{ id: 1, type: "buyer", name: "Иванов Алексей", email: "ivanov@example.com", object: "Кв. 1504 · ЖК Smart Estate", lastSeen: "сегодня 10:42", status: "active" },
	{ id: 2, type: "buyer", name: "ОсОО Аманат Групп", email: "office@amanat.kg", object: "Кв. 1505 · ЖК Smart Estate", lastSeen: "приглашение отправлено", status: "invited" },
	{ id: 3, type: "contractor", name: "ТОО СтройМонтаж", email: "docs@stroi.kz", object: "Договор П-2026-041", lastSeen: "вчера 17:10", status: "active" },
	{ id: 4, type: "investor", name: "Нурлан Абдыкадыров", email: "nurlan@example.com", object: "Доля 24% · БЦ Central", lastSeen: "12.06.2026", status: "active" },
	{ id: 5, type: "tenant", name: "ИП Сейткали", email: "tenant@example.com", object: "Офис 201 · БЦ Central", lastSeen: "доступ ограничен", status: "blocked" },
];

const TYPE_LABEL: Record<PortalType, string> = {
	buyer: "Покупатель",
	contractor: "Подрядчик",
	investor: "Инвестор",
	tenant: "Арендатор",
};

const STATUS_META: Record<AccessStatus, string> = {
	active: "border-emerald-200 bg-emerald-50 text-emerald-700",
	invited: "border-amber-200 bg-amber-50 text-amber-700",
	blocked: "border-rose-200 bg-rose-50 text-rose-700",
};

const STATUS_LABEL: Record<AccessStatus, string> = {
	active: "Активен",
	invited: "Приглашён",
	blocked: "Заблокирован",
};

function modeFromPath(path: string): PortalMode {
	if (path.includes("/buyer")) return "buyer";
	if (path.includes("/contractor")) return "contractor";
	if (path.includes("/investor")) return "investor";
	if (path.includes("/tenant")) return "tenant";
	if (path.includes("/invites")) return "invites";
	if (path.includes("/access")) return "access";
	return "overview";
}

function PortalTabs({ mode }: { mode: PortalMode }) {
	const tabs: Array<{ href: string; mode: PortalMode; label: string; icon: typeof Home }> = [
		{ href: "/portals", mode: "overview", label: "Обзор", icon: Activity },
		{ href: "/portals/buyer", mode: "buyer", label: "Покупатели", icon: Home },
		{ href: "/portals/contractor", mode: "contractor", label: "Подрядчики", icon: Building },
		{ href: "/portals/investor", mode: "investor", label: "Инвесторы", icon: TrendingUp },
		{ href: "/portals/tenant", mode: "tenant", label: "Арендаторы", icon: KeyRound },
		{ href: "/portals/invites", mode: "invites", label: "Приглашения", icon: Mail },
		{ href: "/portals/access", mode: "access", label: "Доступы", icon: ShieldCheck },
	];

	return (
		<div className="am-shell-filter flex gap-1 overflow-x-auto p-1.5">
			{tabs.map((tab) => {
				const Icon = tab.icon;
				const active = tab.mode === mode;
				return (
					<Link key={tab.href} href={tab.href}>
						<div
							className={cn(
								"flex h-10 items-center gap-2 rounded-[16px] px-3 text-sm font-semibold transition-all whitespace-nowrap",
								active ? "bg-slate-950 text-white shadow-lg shadow-slate-950/12" : "text-slate-600 hover:bg-white/80 hover:text-slate-950",
							)}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function PortalTypeCard({ portal }: { portal: (typeof PORTAL_TYPES)[number] }) {
	const Icon = portal.icon;
	return (
		<div className="am-card rounded-[22px] p-5">
			<div className={cn("grid h-12 w-12 place-items-center rounded-[20px] bg-gradient-to-br text-white shadow-lg shadow-slate-950/12", portal.tone)}>
				<Icon className="h-6 w-6" />
			</div>
			<h3 className="mt-4 text-lg font-black text-slate-950">{portal.title}</h3>
			<p className="mt-2 min-h-[44px] text-sm leading-5 text-slate-500">{portal.description}</p>
			<div className="mt-5 flex flex-wrap gap-2">
				<Button asChild size="sm">
					<Link href={portal.href}>Управлять</Link>
				</Button>
				<Button asChild variant="outline" size="sm">
					<Link href={portal.previewHref}>
						<ExternalLink className="h-4 w-4" />
						Предпросмотр
					</Link>
				</Button>
			</div>
		</div>
	);
}

function AccessRow({
	item,
	onToggle,
	onCopy,
}: {
	item: PortalAccess;
	onToggle: (id: number) => void;
	onCopy: (item: PortalAccess) => void;
}) {
	return (
		<div className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 lg:grid-cols-[0.85fr_1.3fr_1.2fr_0.85fr_0.9fr] lg:items-center">
			<div>
				<Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">
					{TYPE_LABEL[item.type]}
				</Badge>
			</div>
			<div className="min-w-0">
				<p className="font-semibold text-slate-950">{item.name}</p>
				<p className="truncate text-sm text-slate-500">{item.email}</p>
			</div>
			<p className="text-sm font-medium text-slate-700">{item.object}</p>
			<p className="text-sm text-slate-500">{item.lastSeen}</p>
			<div className="flex items-center justify-between gap-2 lg:justify-end">
				<span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", STATUS_META[item.status])}>
					{STATUS_LABEL[item.status]}
				</span>
				<Button variant="outline" size="sm" className="h-9 min-h-9 px-3" onClick={() => onCopy(item)}>
					<Copy className="h-4 w-4" />
				</Button>
				<Button variant={item.status === "blocked" ? "default" : "outline"} size="sm" className="h-9 min-h-9 px-3" onClick={() => onToggle(item.id)}>
					{item.status === "blocked" ? "Открыть" : "Закрыть"}
				</Button>
			</div>
		</div>
	);
}

export default function PortalsPage() {
	const [location] = useLocation();
	const { toast } = useToast();
	const mode = modeFromPath(location);
	const [query, setQuery] = useState("");
	const [access, setAccess] = useState(INITIAL_ACCESS);

	const selectedType = ["buyer", "contractor", "investor", "tenant"].includes(mode)
		? (mode as PortalType)
		: null;

	const filteredAccess = useMemo(() => {
		const q = query.trim().toLowerCase();
		return access.filter((item) => {
			if (selectedType && item.type !== selectedType) return false;
			if (mode === "invites" && item.status !== "invited") return false;
			if (!q) return true;
			return [item.name, item.email, item.object, TYPE_LABEL[item.type]].join(" ").toLowerCase().includes(q);
		});
	}, [access, mode, query, selectedType]);

	const toggleAccess = (id: number) => {
		setAccess((current) =>
			current.map((item) =>
				item.id === id
					? { ...item, status: item.status === "blocked" ? "active" : "blocked" }
					: item,
			),
		);
		toast({ title: "Доступ обновлен" });
	};

	const copyInvite = (item: PortalAccess) => {
		void navigator.clipboard?.writeText(`https://planalitycai.vercel.app/portal-login?email=${encodeURIComponent(item.email)}`);
		toast({ title: "Ссылка портала скопирована" });
	};

	const sendInvite = () => {
		toast({ title: "Приглашение подготовлено", description: "Выберите контакт в списке и скопируйте ссылку доступа." });
	};

	const active = access.filter((item) => item.status === "active").length;
	const invited = access.filter((item) => item.status === "invited").length;
	const blocked = access.filter((item) => item.status === "blocked").length;

	return (
		<div className="am-page space-y-5">
			<header className="am-page-header">
				<div className="flex min-w-0 items-start gap-4">
					<div className="grid h-12 w-12 shrink-0 place-items-center rounded-[20px] bg-cyan-100 text-cyan-700">
						<Users className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700">Portal center</p>
						<h1 className="am-page-title mt-1 text-[28px]">Порталы</h1>
						<p className="am-page-subtitle text-sm">
							Единый центр доступа для покупателей, подрядчиков, инвесторов и арендаторов.
						</p>
					</div>
				</div>
				<Button onClick={sendInvite}>
					<Plus className="h-4 w-4" />
					Пригласить
				</Button>
			</header>

			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-[22px] border border-cyan-200 bg-cyan-50/70 p-4 text-cyan-700 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">Типов порталов</p>
					<p className="mt-3 text-3xl font-black">{PORTAL_TYPES.length}</p>
				</div>
				<div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-700 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">Активных</p>
					<p className="mt-3 text-3xl font-black">{active}</p>
				</div>
				<div className="rounded-[22px] border border-amber-200 bg-amber-50/70 p-4 text-amber-700 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">Приглашений</p>
					<p className="mt-3 text-3xl font-black">{invited}</p>
				</div>
				<div className="rounded-[22px] border border-rose-200 bg-rose-50/70 p-4 text-rose-700 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">Закрыто</p>
					<p className="mt-3 text-3xl font-black">{blocked}</p>
				</div>
			</div>

			<PortalTabs mode={mode} />

			{mode === "overview" && (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{PORTAL_TYPES.map((portal) => (
						<PortalTypeCard key={portal.type} portal={portal} />
					))}
				</div>
			)}

			{mode !== "overview" && (
				<>
					<div className="am-shell-filter flex items-center gap-2 p-2">
						<div className="relative min-w-[240px] flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Поиск по имени, email, объекту..."
								className="h-10 rounded-[16px] border-slate-200/90 bg-white/85 pl-9"
							/>
						</div>
						<Button variant="outline" size="sm" onClick={sendInvite}>
							<Send className="h-4 w-4" />
							Отправить
						</Button>
					</div>
					<div className="am-card overflow-hidden rounded-[22px]">
						<div className="grid grid-cols-[0.85fr_1.3fr_1.2fr_0.85fr_0.9fr] gap-3 border-b border-slate-200/70 bg-slate-950 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75 max-lg:hidden">
							<span>Тип</span>
							<span>Контакт</span>
							<span>Объект / договор</span>
							<span>Активность</span>
							<span className="text-right">Доступ</span>
						</div>
						<div className="divide-y divide-slate-100/90">
							{filteredAccess.map((item) => (
								<AccessRow key={item.id} item={item} onToggle={toggleAccess} onCopy={copyInvite} />
							))}
							{filteredAccess.length === 0 && (
								<div className="px-5 py-12 text-center">
									<UserRound className="mx-auto h-8 w-8 text-slate-300" />
									<p className="mt-3 font-semibold text-slate-800">Доступов не найдено</p>
									<p className="mt-1 text-sm text-slate-500">Измените фильтр или отправьте новое приглашение.</p>
								</div>
							)}
						</div>
					</div>
				</>
			)}

			<div className="rounded-[22px] border border-slate-200 bg-white/78 p-4 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="font-bold text-slate-950">Публичный вход в порталы</p>
						<p className="mt-1 text-sm text-slate-500">Единая точка входа для всех внешних пользователей.</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/portal-login">
							<ExternalLink className="h-4 w-4" />
							Открыть вход
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
