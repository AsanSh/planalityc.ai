import {
	Archive,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Eye,
	Gift,
	ImagePlus,
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
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientPortalExperience } from "@/components/client-portal-experience";
import { PortalMediaFeed } from "@/components/portal-media-feed";
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
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	createPortalContentItem,
	deletePortalContentItem,
	getPortalContentItems,
	PORTAL_CONTENT_QUERY_KEY,
	type PortalAudience,
	type PortalContentItem,
	type PortalContentStatus,
	type PortalContentType,
	type PortalPlacement,
	updatePortalContentItem,
} from "@/lib/client-portal";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const B2B_AUDIENCES: PortalAudience[] = ["contractors", "suppliers"];

function isB2BAudience(audience: PortalAudience): boolean {
	return B2B_AUDIENCES.includes(audience);
}

// Placements not relevant for B2B portals
const B2B_HIDDEN_PLACEMENTS: PortalPlacement[] = ["services", "club"];

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

type KpiAccent = { bar: string; chip: string; value: string };

const KPI_ACCENTS: Record<string, KpiAccent> = {
	emerald: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", value: "text-emerald-600" },
	amber: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600", value: "text-amber-600" },
	blue: { bar: "bg-blue-500", chip: "bg-blue-50 text-blue-600", value: "text-blue-600" },
	rose: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-600", value: "text-rose-600" },
	teal: { bar: "bg-teal-500", chip: "bg-teal-50 text-teal-600", value: "text-teal-600" },
};

function KpiCard({
	label,
	value,
	icon: Icon,
	accent,
}: {
	label: string;
	value: number;
	icon: ElementType;
	accent: KpiAccent;
}) {
	return (
		<div className="group relative overflow-hidden rounded-2xl border border-am-border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
			<span className={cn("absolute inset-x-0 top-0 h-1", accent.bar)} />
			<div className="flex items-center justify-between gap-3">
				<div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accent.chip)}>
					<Icon className="h-5 w-5" />
				</div>
				<span className={cn("font-mono text-3xl font-bold leading-none tabular-nums", accent.value)}>
					{value}
				</span>
			</div>
			<p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-am-text-muted">
				{label}
			</p>
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
				{(Boolean(draft.priceLabel) || Number(draft.rewardPoints) > 0) && (
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
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<PortalContentItem | null>(null);
	const [draft, setDraft] = useState<DraftContent>(emptyDraft);
	const [editorOpen, setEditorOpen] = useState(false);
	const [previewAudience, setPreviewAudience] = useState<PortalAudience>("buyers");
	const imageInputRef = useRef<HTMLInputElement>(null);
	const [imageUploading, setImageUploading] = useState(false);

	const { data: items = [] } = useQuery({
		queryKey: PORTAL_CONTENT_QUERY_KEY,
		queryFn: () => getPortalContentItems(),
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: PORTAL_CONTENT_QUERY_KEY });

	const createMutation = useMutation({
		mutationFn: ({ payload }: { payload: DraftContent; publish: boolean }) =>
			createPortalContentItem(payload),
		onSuccess: (created, vars) => {
			invalidate();
			setEditing(created);
			toast({ title: vars.publish ? "Материал опубликован" : "Материал создан" });
		},
		onError: () => toast({ title: "Не удалось сохранить", variant: "destructive" }),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: DraftContent; publish: boolean }) =>
			updatePortalContentItem(id, payload),
		onSuccess: (updated, vars) => {
			invalidate();
			if (updated) setEditing(updated);
			toast({ title: vars.publish ? "Материал опубликован" : "Материал сохранён" });
		},
		onError: () => toast({ title: "Не удалось сохранить", variant: "destructive" }),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deletePortalContentItem(id),
		onSuccess: () => {
			invalidate();
			setEditing(null);
			setDraft(emptyDraft());
			setEditorOpen(false);
			toast({ title: "Материал удалён" });
		},
		onError: () => toast({ title: "Не удалось удалить", variant: "destructive" }),
	});

	const kpi = {
		published: items.filter((item) => item.status === "published").length,
		draft: items.filter((item) => item.status === "draft").length,
		polls: items.filter((item) => item.type === "poll").length,
		closedSales: items.filter((item) => item.type === "closed_sale").length,
		services: items.filter((item) => item.type === "service").length,
	};

	const startCreate = () => {
		setEditing(null);
		setDraft({ ...emptyDraft(), audience: previewAudience });
		setEditorOpen(true);
	};

	const openEditor = (item: PortalContentItem) => {
		setEditing(item);
		setDraft(item);
		setEditorOpen(true);
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
			updateMutation.mutate({ id: editing.id, payload, publish });
			return;
		}
		createMutation.mutate({ payload, publish });
	};

	const remove = () => {
		if (!editing) return;
		if (!confirm(`Удалить «${editing.title}»?`)) return;
		deleteMutation.mutate(editing.id);
	};

	const handleImageFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = async () => {
			const dataUrl = String(reader.result || "");
			// dataUrl = "data:<mime>;base64,<data>"
			const commaIdx = dataUrl.indexOf(",");
			const dataBase64 = dataUrl.slice(commaIdx + 1);
			const contentType = file.type || undefined;
			setImageUploading(true);
			try {
				const { data } = await api.post<{ url: string }>(
					"/portal-content/upload",
					{ filename: file.name, dataBase64, contentType },
				);
				setDraft((prev) => ({ ...prev, imageUrl: data.url }));
				toast({ title: "Изображение загружено" });
			} catch {
				toast({ title: "Не удалось загрузить изображение", variant: "destructive" });
			} finally {
				setImageUploading(false);
			}
		};
		reader.readAsDataURL(file);
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
		setDraft({ ...emptyDraft(), audience: previewAudience, ...templates[type] });
		setEditorOpen(true);
	};

	return (
		<div className="space-y-5 p-6">
			<section className="relative overflow-hidden rounded-3xl border border-am-border bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-800 p-6 text-white shadow-lg sm:p-8">
				<div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
				<div className="relative flex flex-wrap items-start justify-between gap-5">
					<div className="min-w-0 max-w-3xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-inset ring-white/20">
							<Radio className="h-3.5 w-3.5" />
							CRM · Маркетинг
						</span>
						<h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Медиацентр порталов</h1>
						<p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
							Управление тем, что клиенты видят в своих порталах: объявления, опросы, новости,
							закрытые продажи, услуги, клубные задания и ход строительства.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button onClick={startCreate} className="gap-2 rounded-full bg-white px-5 text-teal-900 shadow-sm hover:bg-cyan-50">
							<Plus className="h-4 w-4" />
							Новый материал
						</Button>
					</div>
				</div>
			</section>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<KpiCard label="Опубликовано" value={kpi.published} icon={CheckCircle2} accent={KPI_ACCENTS.emerald} />
				<KpiCard label="Черновики" value={kpi.draft} icon={Clock3} accent={KPI_ACCENTS.amber} />
				<KpiCard label="Опросы" value={kpi.polls} icon={Vote} accent={KPI_ACCENTS.blue} />
				<KpiCard label="Закрытые продажи" value={kpi.closedSales} icon={Radio} accent={KPI_ACCENTS.rose} />
				<KpiCard label="Услуги" value={kpi.services} icon={Wrench} accent={KPI_ACCENTS.teal} />
			</div>

			<section className="rounded-2xl border border-am-border bg-white p-4 shadow-sm sm:p-6">
				<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
							Живой портал клиента
						</p>
						<h2 className="text-2xl font-bold text-am-text-strong">Портал глазами клиента</h2>
						<p className="mt-1 text-sm text-am-text-muted">
							Нажмите на блок, чтобы отредактировать. Новые блоки добавляйте из меню снизу.
						</p>
					</div>
					<Select value={previewAudience} onValueChange={(value) => setPreviewAudience(value as PortalAudience)}>
						<SelectTrigger className="w-full sm:!w-[220px]">
							<SelectValue placeholder="Аудитория" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="buyers">Покупатель</SelectItem>
							<SelectItem value="tenants">Арендатор</SelectItem>
							<SelectItem value="investors">Инвестор</SelectItem>
							<SelectItem value="contractors">Подрядчик</SelectItem>
							<SelectItem value="suppliers">Поставщик</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{isB2BAudience(previewAudience) ? (
					<PortalMediaFeed audience={previewAudience} variant="desktop" />
				) : (
					<ClientPortalExperience
						variant="desktop"
						audience={previewAudience}
						editable
						includeDrafts
						activeId={editing?.id ?? null}
						onSelectItem={openEditor}
						userName="Клиент"
						projectName="ОсОО Смарт Эстейт"
						unitLabel="Квартира №264"
						managerName="Менеджер объекта"
					/>
				)}
			</section>

			<div className="pointer-events-none sticky bottom-4 z-30 flex justify-center">
				<div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-am-border bg-white/95 p-2 shadow-lg backdrop-blur">
					<span className="shrink-0 pl-2 pr-1 text-xs font-semibold uppercase tracking-wide text-am-text-muted">
						+ Блок
					</span>
					{QUICK_TEMPLATES.map((type) => {
						const Icon = TYPE_ICONS[type];
						return (
							<button
								key={type}
								type="button"
								onClick={() => applyTemplate(type)}
								className="group flex shrink-0 items-center gap-2 rounded-xl border border-am-border bg-white px-3 py-2 text-sm font-semibold text-am-text-strong shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
							>
								<span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", typeTone(type))}>
									<Icon className="h-4 w-4" />
								</span>
								<span className="whitespace-nowrap">{TYPE_LABELS[type]}</span>
							</button>
						);
					})}
				</div>
			</div>

			<Sheet open={editorOpen} onOpenChange={setEditorOpen}>
				<SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
					<SheetHeader className="border-b border-am-border p-5">
						<SheetTitle className="flex items-center justify-between gap-3">
							<span>{editing ? "Редактировать материал" : "Новый материал"}</span>
							{editing && (
								<Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={remove}>
									<Trash2 className="h-3.5 w-3.5" />
									Удалить
								</Button>
							)}
						</SheetTitle>
					</SheetHeader>

					<div className="space-y-5 p-5">
						<PortalPreviewCard draft={draft} />

						<div className="grid grid-cols-2 gap-3">
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
										{Object.entries(PLACEMENT_LABELS)
											.filter(([value]) =>
												!isB2BAudience(draft.audience) ||
												!B2B_HIDDEN_PLACEMENTS.includes(value as PortalPlacement),
											)
											.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						</div>

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
								className="mt-1 min-h-[100px]"
								value={draft.body}
								onChange={(event) => setDraft({ ...draft, body: event.target.value })}
								placeholder="Что клиент увидит в портале"
							/>
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

						<div className="grid grid-cols-2 gap-3">
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
								<div className="mt-1 flex gap-2">
									<Input
										className="min-w-0 flex-1"
										value={draft.imageUrl || ""}
										onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
										placeholder="https://..."
									/>
									<input
										ref={imageInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={(e) => {
											const f = e.target.files?.[0];
											if (f) handleImageFile(f);
											e.target.value = "";
										}}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={imageUploading}
										onClick={() => imageInputRef.current?.click()}
										className="shrink-0 gap-1.5"
									>
										<ImagePlus className="h-4 w-4" />
										{imageUploading ? "…" : "Загрузить"}
									</Button>
								</div>
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
								В портал попадёт только со статусом «Опубликовано».
							</p>
						</div>
					</div>

					<div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2 border-t border-am-border bg-white p-4">
						<Button type="button" variant="outline" className="gap-2 rounded-full" onClick={() => save(false)}>
							<Archive className="h-4 w-4" />
							Сохранить
						</Button>
						<Button type="button" className="gap-2 rounded-full bg-teal-600 hover:bg-teal-700" onClick={() => save(true)}>
							<CheckCircle2 className="h-4 w-4" />
							Опубликовать
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
