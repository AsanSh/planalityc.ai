import {
	Archive,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Eye,
	Gift,
	LayoutGrid,
	Megaphone,
	Newspaper,
	Percent,
	Pin,
	Plus,
	Radio,
	Search,
	Send,
	Smartphone,
	Trash2,
	Users,
	Vote,
	Wrench,
} from "lucide-react";
import type { ElementType } from "react";
import { useMemo, useState } from "react";
import { ClientPortalExperience } from "@/components/client-portal-experience";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	createPortalContentItem,
	deletePortalContentItem,
	getPortalContentItems,
	type PortalAudience,
	type PortalContentItem,
	type PortalContentStatus,
	type PortalContentType,
	type PortalPlacement,
	updatePortalContentItem,
} from "@/lib/client-portal";
import { cn } from "@/lib/utils";

type DraftContent = Omit<PortalContentItem, "id" | "createdAt" | "updatedAt">;

const TYPE_LABELS: Record<PortalContentType, string> = {
	news: "Новость",
	announcement: "Объявление",
	poll: "Опрос",
	promotion: "Реклама",
	closed_sale: "Закрытая продажа",
	broadcast: "Рассылка",
	service: "Услуга",
	club_task: "Закрытый клуб / бонусы",
	construction_update: "Ход строительства",
	property_catalog: "Каталог ЖК",
};

const TYPE_ICONS: Record<PortalContentType, ElementType> = {
	news: Newspaper,
	announcement: Megaphone,
	poll: Vote,
	promotion: Percent,
	closed_sale: Radio,
	broadcast: Send,
	service: Wrench,
	club_task: Gift,
	construction_update: Megaphone,
	property_catalog: LayoutGrid,
};

const PLACEMENT_LABELS: Record<PortalPlacement, string> = {
	home: "Главная",
	my_home: "Мой дом",
	services: "Услуги",
	club: "Закрытый клуб",
	catalog: "Каталог ЖК",
	documents: "Документы",
};

const AUDIENCE_LABELS: Record<PortalAudience, string> = {
	all: "Все порталы",
	buyers: "Покупатели",
	tenants: "Арендаторы",
	investors: "Инвесторы",
	contractors: "Подрядчики",
	suppliers: "Поставщики",
};

const STATUS_LABELS: Record<PortalContentStatus, string> = {
	draft: "Черновик",
	published: "Опубликовано",
	archived: "Архив",
};

const QUICK_TEMPLATES: PortalContentType[] = [
	"announcement",
	"poll",
	"promotion",
	"service",
	"club_task",
	"construction_update",
	"closed_sale",
	"property_catalog",
];

const emptyDraft = (): DraftContent => ({
	type: "news",
	status: "draft",
	audience: "buyers",
	placement: "home",
	title: "",
	body: "",
	projectName: "",
	imageUrl: "",
	priceLabel: "",
	rewardPoints: 0,
	ctaLabel: "",
	ctaUrl: "",
	pollOptions: ["", ""],
	pinned: false,
	publishAt: new Date().toISOString().slice(0, 10),
	expiresAt: "",
});

function fmtDate(date: string) {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function statusTone(status: PortalContentStatus) {
	if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
	if (status === "archived") return "border-slate-200 bg-slate-100 text-slate-600";
	return "border-amber-200 bg-amber-50 text-amber-700";
}

function typeTone(type: PortalContentType) {
	if (type === "closed_sale") return "bg-rose-50 text-rose-700";
	if (type === "club_task") return "bg-amber-50 text-amber-800";
	if (type === "poll") return "bg-blue-50 text-blue-700";
	if (type === "service") return "bg-emerald-50 text-emerald-700";
	return "bg-cyan-50 text-cyan-700";
}

function KpiCard({
	label,
	value,
	icon: Icon,
	tone = "text-cyan-700",
}: {
	label: string;
	value: number;
	icon: ElementType;
	tone?: string;
}) {
	return (
		<div className="rounded-xl border border-am-border bg-white p-3 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-am-text-muted">
						{label}
					</p>
					<p className={cn("mt-1.5 font-mono text-xl font-semibold leading-none", tone)}>
						{value}
					</p>
				</div>
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-am-surface-subtle">
					<Icon className="h-4 w-4 text-am-text-muted" />
				</div>
			</div>
		</div>
	);
}

function PortalPreviewCard({ draft }: { draft: DraftContent }) {
	const Icon = TYPE_ICONS[draft.type];
	const title = draft.title.trim() || "Новый материал портала";
	const body =
		draft.body.trim() ||
		"Так материал будет выглядеть в клиентском портале до публикации.";
	return (
		<div className="overflow-hidden rounded-2xl border border-am-border bg-white shadow-sm">
			<div
				className={cn(
					"min-h-[150px] p-5 text-white",
					draft.type === "club_task"
						? "bg-gradient-to-r from-slate-950 to-amber-800"
						: draft.type === "closed_sale"
							? "bg-gradient-to-r from-rose-700 to-orange-500"
							: draft.type === "service"
								? "bg-gradient-to-r from-emerald-700 to-teal-500"
								: "bg-gradient-to-r from-cyan-800 to-teal-500",
				)}
				style={draft.imageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.72), rgba(2,6,23,.12)), url(${draft.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
			>
				<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
					<Icon className="h-4 w-4" />
					<span>{TYPE_LABELS[draft.type]}</span>
				</div>
				<h3 className="mt-4 text-xl font-bold leading-tight">{title}</h3>
				<p className="mt-2 line-clamp-3 text-sm text-white/85">{body}</p>
			</div>
			<div className="space-y-3 p-4">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{AUDIENCE_LABELS[draft.audience]}</Badge>
					<Badge variant="secondary">{PLACEMENT_LABELS[draft.placement ?? "home"]}</Badge>
					{draft.pinned && (
						<Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">
							Закреплено
						</Badge>
					)}
				</div>
				{(draft.priceLabel || draft.rewardPoints) && (
					<div className="flex flex-wrap gap-2 text-sm">
						{draft.priceLabel && (
							<span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">
								{draft.priceLabel}
							</span>
						)}
						{Number(draft.rewardPoints || 0) > 0 && (
							<span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">
								{draft.rewardPoints} бонусов
							</span>
						)}
					</div>
				)}
				<Button type="button" className="w-full rounded-full bg-teal-600 hover:bg-teal-700">
					{draft.ctaLabel || "Подробнее"}
				</Button>
			</div>
		</div>
	);
}

function MaterialCard({
	item,
	active,
	onOpen,
}: {
	item: PortalContentItem;
	active: boolean;
	onOpen: () => void;
}) {
	const Icon = TYPE_ICONS[item.type];
	return (
		<button
			type="button"
			onClick={onOpen}
			className={cn(
				"group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md",
				active ? "border-cyan-300 ring-2 ring-cyan-100" : "border-am-border",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 gap-3">
					<div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", typeTone(item.type))}>
						<Icon className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<p className="truncate text-base font-semibold text-am-text-strong">
								{item.title || "Без названия"}
							</p>
							{item.pinned && <Pin className="h-3.5 w-3.5 text-amber-600" />}
						</div>
						<p className="mt-1 line-clamp-2 text-sm text-am-text-muted">{item.body || TYPE_LABELS[item.type]}</p>
					</div>
				</div>
				<span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(item.status))}>
					{STATUS_LABELS[item.status]}
				</span>
			</div>
			<div className="mt-4 grid gap-2 text-xs text-am-text-muted sm:grid-cols-3">
				<span className="inline-flex items-center gap-1.5">
					<Users className="h-3.5 w-3.5" />
					{AUDIENCE_LABELS[item.audience]}
				</span>
				<span className="inline-flex items-center gap-1.5">
					<Smartphone className="h-3.5 w-3.5" />
					{PLACEMENT_LABELS[item.placement ?? "home"]}
				</span>
				<span className="inline-flex items-center gap-1.5">
					<CalendarDays className="h-3.5 w-3.5" />
					{fmtDate(item.publishAt)}
				</span>
			</div>
		</button>
	);
}

export default function CrmMediaCenter() {
	const { toast } = useToast();
	const [items, setItems] = useState<PortalContentItem[]>(() => getPortalContentItems());
	const [editing, setEditing] = useState<PortalContentItem | null>(null);
	const [draft, setDraft] = useState<DraftContent>(emptyDraft);
	const [workspaceMode, setWorkspaceMode] = useState<"content" | "preview">("content");
	const [previewAudience, setPreviewAudience] = useState<PortalAudience>("buyers");
	const [typeFilter, setTypeFilter] = useState<"all" | PortalContentType>("all");
	const [statusFilter, setStatusFilter] = useState<"all" | PortalContentStatus>("all");
	const [audienceFilter, setAudienceFilter] = useState<"all" | PortalAudience>("all");
	const [placementFilter, setPlacementFilter] = useState<"all" | PortalPlacement>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filtered = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return items.filter((item) => {
			const matchesQuery =
				!query ||
				item.title.toLowerCase().includes(query) ||
				item.body.toLowerCase().includes(query) ||
				(item.projectName || "").toLowerCase().includes(query);
			return (
				matchesQuery &&
				(typeFilter === "all" || item.type === typeFilter) &&
				(statusFilter === "all" || item.status === statusFilter) &&
				(audienceFilter === "all" || item.audience === audienceFilter) &&
				(placementFilter === "all" || (item.placement ?? "home") === placementFilter)
			);
		});
	}, [audienceFilter, items, placementFilter, searchQuery, statusFilter, typeFilter]);

	const kpi = {
		published: items.filter((item) => item.status === "published").length,
		draft: items.filter((item) => item.status === "draft").length,
		polls: items.filter((item) => item.type === "poll").length,
		closedSales: items.filter((item) => item.type === "closed_sale").length,
		services: items.filter((item) => item.type === "service").length,
	};

	const startCreate = () => {
		setEditing(null);
		setDraft(emptyDraft());
		setWorkspaceMode("content");
	};

	const save = (publish = false) => {
		const title = draft.title.trim();
		if (!title) {
			toast({ title: "Укажите заголовок", variant: "destructive" });
			return;
		}
		const payload: DraftContent = {
			...draft,
			title,
			body: draft.body.trim(),
			status: publish ? "published" : draft.status,
			pollOptions: draft.type === "poll" ? (draft.pollOptions || []).filter(Boolean) : [],
			rewardPoints: Number(draft.rewardPoints || 0),
		};
		if (editing) {
			const updated = updatePortalContentItem(editing.id, payload);
			setItems(getPortalContentItems());
			if (updated) setEditing(updated);
			toast({ title: publish ? "Материал опубликован" : "Материал сохранён" });
			return;
		}
		const created = createPortalContentItem(payload);
		setItems(getPortalContentItems());
		setEditing(created);
		toast({ title: publish ? "Материал опубликован" : "Материал создан" });
	};

	const remove = () => {
		if (!editing) return;
		if (!confirm(`Удалить «${editing.title}»?`)) return;
		deletePortalContentItem(editing.id);
		setItems(getPortalContentItems());
		setEditing(null);
		setDraft(emptyDraft());
		toast({ title: "Материал удалён" });
	};

	const applyTemplate = (type: PortalContentType) => {
		const templates: Record<PortalContentType, Partial<DraftContent>> = {
			news: {
				type,
				placement: "home",
				title: "Новость комплекса",
				body: "Короткая новость для клиентов портала",
				ctaLabel: "Подробнее",
			},
			announcement: {
				type,
				placement: "my_home",
				title: "Объявление для жителей",
				body: "Важная информация по дому и обслуживанию",
				ctaLabel: "Открыть",
			},
			poll: {
				type,
				placement: "my_home",
				title: "Опрос жителей",
				body: "Помогите выбрать удобный вариант",
				pollOptions: ["Да", "Нет"],
				ctaLabel: "Проголосовать",
			},
			promotion: {
				type,
				placement: "home",
				title: "Акция для клиентов",
				body: "Специальное предложение от партнёров",
				ctaLabel: "Получить",
			},
			closed_sale: {
				type,
				placement: "home",
				title: "Закрытая продажа",
				body: "Предложение доступно только клиентам портала",
				ctaLabel: "Посмотреть",
			},
			broadcast: {
				type,
				placement: "home",
				title: "Рассылка клиентам",
				body: "Сообщение для выбранной аудитории",
				ctaLabel: "Подробнее",
			},
			service: {
				type,
				placement: "services",
				title: "Ремонт окон",
				body: "Регулировка, замена уплотнителя и сервис",
				priceLabel: "от 12 000 сом",
				ctaLabel: "Заказать",
			},
			club_task: {
				type,
				placement: "club",
				title: "Запишись на встречу с менеджером",
				body: "Задание закрытого клуба для начисления бонусов",
				rewardPoints: 200,
				ctaLabel: "Выполнить",
			},
			construction_update: {
				type,
				placement: "my_home",
				title: "Передача ключей",
				body: "Ход строительства и этапы готовности объекта",
				ctaLabel: "Смотреть",
			},
			property_catalog: {
				type,
				placement: "catalog",
				title: "Каталог ЖК",
				body: "Подборка объектов для клиента",
				ctaLabel: "Открыть каталог",
			},
		};
		setEditing(null);
		setDraft({ ...emptyDraft(), ...templates[type] });
	};

	return (
		<div className="space-y-5 p-6">
			<section className="rounded-2xl border border-am-border bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
							CRM-маркетинг
						</p>
						<h1 className="mt-2 text-3xl font-bold text-am-text-strong">Медиацентр порталов</h1>
						<p className="mt-1 max-w-3xl text-am-text-muted">
							Управление тем, что клиенты видят в своих порталах: объявления, опросы, новости,
							закрытые продажи, услуги, клубные задания и ход строительства.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							className="gap-2 rounded-full"
							onClick={() => setWorkspaceMode("preview")}
						>
							<Eye className="h-4 w-4" />
							Превью портала
						</Button>
						<Button onClick={startCreate} className="gap-2 rounded-full bg-teal-600 px-5 hover:bg-teal-700">
							<Plus className="h-4 w-4" />
							Новый материал
						</Button>
					</div>
				</div>
			</section>

			<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
				<KpiCard label="Опубликовано" value={kpi.published} icon={CheckCircle2} tone="text-emerald-700" />
				<KpiCard label="Черновики" value={kpi.draft} icon={Clock3} tone="text-amber-700" />
				<KpiCard label="Опросы" value={kpi.polls} icon={Vote} tone="text-blue-700" />
				<KpiCard label="Закрытые продажи" value={kpi.closedSales} icon={Radio} tone="text-rose-700" />
				<KpiCard label="Услуги" value={kpi.services} icon={Wrench} tone="text-cyan-700" />
			</div>

			<section className="rounded-2xl border border-am-border bg-white p-3 shadow-sm">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="inline-flex w-full rounded-full bg-am-surface-subtle p-1 sm:w-auto">
						<button
							type="button"
							onClick={() => setWorkspaceMode("content")}
							className={cn(
								"flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none",
								workspaceMode === "content"
									? "bg-am-primary text-white shadow-sm"
									: "text-am-text-muted hover:text-am-text-strong",
							)}
						>
							Контент
						</button>
						<button
							type="button"
							onClick={() => setWorkspaceMode("preview")}
							className={cn(
								"flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none",
								workspaceMode === "preview"
									? "bg-am-primary text-white shadow-sm"
									: "text-am-text-muted hover:text-am-text-strong",
							)}
						>
							Превью клиента
						</button>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Select value={previewAudience} onValueChange={(value) => setPreviewAudience(value as PortalAudience)}>
							<SelectTrigger className="w-full sm:w-[220px]">
								<SelectValue placeholder="Аудитория превью" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="buyers">Покупатель</SelectItem>
								<SelectItem value="tenants">Арендатор</SelectItem>
								<SelectItem value="investors">Инвестор</SelectItem>
								<SelectItem value="contractors">Подрядчик</SelectItem>
								<SelectItem value="suppliers">Поставщик</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-am-text-muted">
							Предпросмотр показывает опубликованные материалы выбранной аудитории.
						</p>
					</div>
				</div>
			</section>

			{workspaceMode === "preview" ? (
				<div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
					<section className="rounded-2xl border border-am-border bg-white p-5 shadow-sm">
						<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
									Живой предпросмотр
								</p>
								<h2 className="text-2xl font-bold text-am-text-strong">Портал глазами клиента</h2>
								<p className="mt-1 text-sm text-am-text-muted">
									Проверяйте, как опубликованные материалы попадут на главную, в “Мой дом”, услуги,
									клуб и каталог.
								</p>
							</div>
							<Badge variant="secondary">{AUDIENCE_LABELS[previewAudience]}</Badge>
						</div>
						<div className="mx-auto max-w-5xl">
							<ClientPortalExperience
								audience={previewAudience}
								userName="Клиент"
								projectName="ОсОО Смарт Эстейт"
								unitLabel="Квартира №264"
								managerName="Менеджер объекта"
							/>
						</div>
					</section>
					<aside className="space-y-4 rounded-2xl border border-am-border bg-white p-5 shadow-sm">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-am-text-muted">
								Редакционный контроль
							</p>
							<h2 className="mt-1 text-xl font-bold text-am-text-strong">Что увидит клиент</h2>
							<p className="mt-2 text-sm text-am-text-muted">
								Черновики остаются внутри CRM. В портал попадают только опубликованные материалы
								для выбранной аудитории и места показа.
							</p>
						</div>
						<PortalPreviewCard draft={draft} />
						<Button
							type="button"
							variant="outline"
							className="w-full rounded-full"
							onClick={() => setWorkspaceMode("content")}
						>
							Вернуться к редактору
						</Button>
					</aside>
				</div>
			) : (
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
					<div className="space-y-4">
						<section className="rounded-2xl border border-am-border bg-white p-4 shadow-sm">
							<div className="flex flex-wrap items-center gap-3">
								<div className="relative min-w-[260px] flex-1">
									<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-am-text-muted" />
									<Input
										value={searchQuery}
										onChange={(event) => setSearchQuery(event.target.value)}
										placeholder="Поиск по заголовку, тексту, проекту..."
										className="pl-9"
									/>
								</div>
								<Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
									<SelectTrigger className="w-full min-w-0 sm:w-[150px]">
										<SelectValue placeholder="Тип" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Все типы</SelectItem>
										{Object.entries(TYPE_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
									<SelectTrigger className="w-full min-w-0 sm:w-[150px]">
										<SelectValue placeholder="Статус" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Все статусы</SelectItem>
										{Object.entries(STATUS_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={audienceFilter} onValueChange={(value) => setAudienceFilter(value as typeof audienceFilter)}>
									<SelectTrigger className="w-full min-w-0 sm:w-[170px]">
										<SelectValue placeholder="Аудитория" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Все порталы</SelectItem>
										{Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
											value === "all" ? null :
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={placementFilter} onValueChange={(value) => setPlacementFilter(value as typeof placementFilter)}>
									<SelectTrigger className="w-full min-w-0 sm:w-[160px]">
										<SelectValue placeholder="Размещение" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Все места</SelectItem>
										{Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="outline"
									className="w-full whitespace-nowrap sm:w-auto"
									onClick={() => {
										setSearchQuery("");
										setTypeFilter("all");
										setStatusFilter("all");
										setAudienceFilter("all");
										setPlacementFilter("all");
									}}
								>
									Сбросить
								</Button>
							</div>
						</section>

						<section className="rounded-2xl border border-am-border bg-white p-5 shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-bold text-am-text-strong">Материалы портала</h2>
									<p className="text-sm text-am-text-muted">
										{filtered.length} из {items.length} материалов · откройте карточку для редактирования в конструкторе
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{QUICK_TEMPLATES.slice(0, 4).map((type) => {
										const Icon = TYPE_ICONS[type];
										return (
											<Button
												key={type}
												type="button"
												variant="outline"
												size="sm"
												className="gap-1.5 rounded-full"
												onClick={() => applyTemplate(type)}
											>
												<Icon className="h-3.5 w-3.5" />
												{TYPE_LABELS[type]}
											</Button>
										);
									})}
								</div>
							</div>

							{filtered.length > 0 ? (
								<div className="mt-4 grid gap-3 xl:grid-cols-2">
									{filtered.map((item) => (
										<MaterialCard
											key={item.id}
											item={item}
											active={editing?.id === item.id}
											onOpen={() => {
												setEditing(item);
												setDraft(item);
											}}
										/>
									))}
								</div>
							) : (
								<div className="mt-5 rounded-2xl border border-dashed border-am-border bg-am-surface-subtle p-6">
									<div className="mx-auto max-w-2xl text-center">
										<Newspaper className="mx-auto h-10 w-10 text-am-text-muted/40" />
										<h3 className="mt-3 text-lg font-bold text-am-text-strong">Материалов пока нет</h3>
										<p className="mt-1 text-sm text-am-text-muted">
											Начните с шаблона: объявление, опрос, услуга, закрытая продажа или ход строительства.
										</p>
									</div>
									<div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
										{QUICK_TEMPLATES.map((type) => {
											const Icon = TYPE_ICONS[type];
											return (
												<button
													key={type}
													type="button"
													onClick={() => applyTemplate(type)}
													className="rounded-xl border border-am-border bg-white p-3 text-left shadow-sm transition hover:border-cyan-200 hover:shadow-md"
												>
													<Icon className="h-4 w-4 text-cyan-700" />
													<p className="mt-2 text-sm font-semibold text-am-text-strong">{TYPE_LABELS[type]}</p>
												</button>
											);
										})}
									</div>
								</div>
							)}
						</section>
					</div>

					<aside className="h-fit rounded-2xl border border-am-border bg-white p-5 shadow-sm xl:sticky xl:top-4">
						<div className="mb-5 flex items-start justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-am-text-muted">
									Конструктор публикации
								</p>
								<h2 className="text-xl font-bold text-am-text-strong">
									{editing ? "Редактировать материал" : "Новый материал"}
								</h2>
							</div>
							{editing && (
								<Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={remove}>
									<Trash2 className="h-3.5 w-3.5" />
									Удалить
								</Button>
							)}
						</div>

						<div className="space-y-5">
							<PortalPreviewCard draft={draft} />

							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-am-text-muted">
									Быстрый шаблон
								</p>
								<div className="flex flex-wrap gap-2 rounded-xl border border-am-border bg-am-surface-subtle p-3">
									{QUICK_TEMPLATES.map((type) => (
										<Button
											key={type}
											type="button"
											variant="outline"
											size="sm"
											className="h-8 rounded-full bg-white"
											onClick={() => applyTemplate(type)}
										>
											{TYPE_LABELS[type]}
										</Button>
									))}
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
								<div>
									<Label>Тип материала</Label>
									<Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as PortalContentType })}>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(TYPE_LABELS).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Статус</Label>
									<Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as PortalContentStatus })}>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="draft">Черновик</SelectItem>
											<SelectItem value="published">Опубликовано</SelectItem>
											<SelectItem value="archived">Архив</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Аудитория</Label>
									<Select value={draft.audience} onValueChange={(value) => setDraft({ ...draft, audience: value as PortalAudience })}>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Размещение</Label>
									<Select value={draft.placement || "home"} onValueChange={(value) => setDraft({ ...draft, placement: value as PortalPlacement })}>
										<SelectTrigger className="mt-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-3">
								<div>
									<Label>Заголовок</Label>
									<Input
										className="mt-1"
										value={draft.title}
										onChange={(event) => setDraft({ ...draft, title: event.target.value })}
										placeholder="Например: передача ключей"
									/>
								</div>
								<div>
									<Label>Текст для клиента</Label>
									<Textarea
										className="mt-1 min-h-[112px]"
										value={draft.body}
										onChange={(event) => setDraft({ ...draft, body: event.target.value })}
										placeholder="Что клиент увидит в портале"
									/>
								</div>
							</div>

							{draft.type === "poll" && (
								<div>
									<Label>Варианты опроса</Label>
									<div className="mt-2 space-y-2">
										{(draft.pollOptions || []).map((option, index) => (
											<Input
												key={index}
												value={option}
												onChange={(event) => {
													const next = [...(draft.pollOptions || [])];
													next[index] = event.target.value;
													setDraft({ ...draft, pollOptions: next });
												}}
												placeholder={`Вариант ${index + 1}`}
											/>
										))}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setDraft({ ...draft, pollOptions: [...(draft.pollOptions || []), ""] })}
										>
											Добавить вариант
										</Button>
									</div>
								</div>
							)}

							<div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
								<div>
									<Label>Проект / ЖК</Label>
									<Input
										className="mt-1"
										value={draft.projectName || ""}
										onChange={(event) => setDraft({ ...draft, projectName: event.target.value })}
										placeholder="Опционально"
									/>
								</div>
								<div>
									<Label>Баннер URL</Label>
									<Input
										className="mt-1"
										value={draft.imageUrl || ""}
										onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
										placeholder="https://..."
									/>
								</div>
								<div>
									<Label>Дата публикации</Label>
									<Input
										className="mt-1"
										type="date"
										value={draft.publishAt.slice(0, 10)}
										onChange={(event) => setDraft({ ...draft, publishAt: event.target.value })}
									/>
								</div>
								<div>
									<Label>Дата окончания</Label>
									<Input
										className="mt-1"
										type="date"
										value={(draft.expiresAt || "").slice(0, 10)}
										onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
									/>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
								<div>
									<Label>Цена / подпись</Label>
									<Input
										className="mt-1"
										value={draft.priceLabel || ""}
										onChange={(event) => setDraft({ ...draft, priceLabel: event.target.value })}
										placeholder="от 12 000 сом"
									/>
								</div>
								<div>
									<Label>Бонусы клуба</Label>
									<Input
										className="mt-1"
										type="number"
										value={draft.rewardPoints || 0}
										onChange={(event) => setDraft({ ...draft, rewardPoints: Number(event.target.value) })}
										placeholder="200"
									/>
								</div>
								<div>
									<Label>Текст кнопки</Label>
									<Input
										className="mt-1"
										value={draft.ctaLabel || ""}
										onChange={(event) => setDraft({ ...draft, ctaLabel: event.target.value })}
										placeholder="Подробнее"
									/>
								</div>
								<div>
									<Label>Ссылка кнопки</Label>
									<Input
										className="mt-1"
										value={draft.ctaUrl || ""}
										onChange={(event) => setDraft({ ...draft, ctaUrl: event.target.value })}
										placeholder="https://..."
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-am-border bg-am-surface-subtle p-3">
								<button
									type="button"
									onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}
									className={cn(
										"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
										draft.pinned ? "bg-amber-100 text-amber-800" : "bg-white text-am-text-muted",
									)}
								>
									<Pin className="h-3.5 w-3.5" />
									{draft.pinned ? "Закреплено" : "Не закреплено"}
								</button>
								<p className="text-xs text-am-text-muted">
									Публикация попадёт в портал после сохранения со статусом “Опубликовано”.
								</p>
							</div>

							<div className="grid gap-2 sm:grid-cols-2">
								<Button type="button" variant="outline" className="gap-2 rounded-full" onClick={() => save(false)}>
									<Archive className="h-4 w-4" />
									Сохранить
								</Button>
								<Button type="button" className="gap-2 rounded-full bg-teal-600 hover:bg-teal-700" onClick={() => save(true)}>
									<CheckCircle2 className="h-4 w-4" />
									Опубликовать
								</Button>
							</div>
						</div>
					</aside>
				</div>
			)}
		</div>
	);
}
