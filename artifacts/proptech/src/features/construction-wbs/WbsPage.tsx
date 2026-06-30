import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BarChart3,
	Grid3X3,
	Layers,
	ListTree,
	Loader2,
	Plus,
	Sparkles,
	Table2,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/currency-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api, getAuthToken } from "@/lib/api";
import { getApiBase } from "@/lib/api-base";
import {
	fmtCurrencyAmount,
	kgsToDisplay,
	nbkrUsdRateLabel,
	type DisplayCurrency,
	type NbkrResponse,
} from "@/lib/nbkr-currency";
import { WbsCardsView } from "./WbsCardsView";
import { WbsDashboard } from "./WbsDashboard";
import { WbsGanttView } from "./WbsGanttView";
import { WbsStageDialog } from "./WbsStageDialog";
import { WbsStageDrawer } from "./WbsStageDrawer";
import { WbsTableView } from "./WbsTableView";
import { WbsTreeView } from "./WbsTreeView";
import { computeProjectDashboard, computeStageMetricsMap } from "./metrics";
import { flatToReorderPayload, flattenWbsTree } from "./tree";
import type {
	DialogState,
	FlatWbsNode,
	ProjectOption,
	WbsExpenseRow,
	WbsStage,
	WbsTaskSummary,
	WbsViewMode,
} from "./types";

const BASE = getApiBase();
const VIEW_STORAGE_KEY = "construction-wbs-view-mode";

const ah = () => {
	const t = getAuthToken();
	return {
		"Content-Type": "application/json",
		...(t ? { Authorization: `Bearer ${t}` } : {}),
	};
};

const VIEW_OPTS: { id: WbsViewMode; label: string; icon: typeof Layers }[] = [
	{ id: "wbs", label: "WBS", icon: ListTree },
	{ id: "cards", label: "Карточки", icon: Grid3X3 },
	{ id: "table", label: "Таблица", icon: Table2 },
	{ id: "gantt", label: "Гант", icon: BarChart3 },
];

const DEFAULT_STAGE_TEMPLATE: { name: string; children?: string[] }[] = [
	{
		name: "Подготовительные работы",
		children: [
			"Геодезическая разбивка осей",
			"Ограждение строительной площадки",
			"Организация временных дорог",
			"Подключение временного электроснабжения",
			"Подключение временного водоснабжения",
			"Устройство бытового городка и складских площадок",
			"Вынос существующих инженерных сетей",
			"Демонтаж существующих сооружений",
		],
	},
	{
		name: "Земляные работы",
		children: [
			"Разработка котлована",
			"Разработка траншей",
			"Вывоз грунта",
			"Обратная засыпка",
			"Уплотнение грунта",
		],
	},
	{
		name: "Нулевой цикл",
		children: [
			"Свайные/ленточные фундаменты",
			"Устройство фундаментной плиты",
			"Ростверки",
			"Монолитные стены подвала",
			"Колонны подземной части",
			"Плита перекрытия над подземным этажом",
			"Гидроизоляция фундаментов",
			"Теплоизоляция подземных конструкций",
			"Обратная засыпка котлована",
		],
	},
	{
		name: "Железо-бетонные работы",
		children: [
			"Вертикальные конструкции",
			"Горизонтальные конструкции",
			"Плита перекрытия",
			"Лестницы",
			"Лифтовая шахта",
		],
	},
	{
		name: "Устройство стен и перегородок",
		children: ["Наружные стены", "Внутренние стены", "Перегородки"],
	},
	{
		name: "Кровля",
		children: [
			"Несущие конструкции",
			"Утепление",
			"Гидроизоляция",
			"Кровельное покрытие",
			"Водосточная система",
		],
	},
	{
		name: "Внутренняя отделка",
		children: ["Черновая отделка", "Чистовая отделка", "Устройство полов"],
	},
	{
		name: "Окна и двери",
		children: [
			"Оконные блоки",
			"Входные двери",
			"Противопожарные двери",
			"Фурнитура",
			"Монтажные швы",
			"Герметизация примыканий",
		],
	},
	{
		name: "Инженерные сети",
		children: [
			"Электроснабжение",
			"Водоснабжение и канализация",
			"Отопление",
			"Вентиляция и дымоудаление",
			"Системы пожарной безопасности",
			"Кондиционирование",
			"Слаботочные системы",
		],
	},
	{
		name: "Фасадные работы",
		children: [
			"Утепление фасада",
			"Устройство подсистемы",
			"Облицовка керамогранитом / композит",
			"Отливы",
			"Откосы",
		],
	},
	{
		name: "Благоустройство",
		children: [
			"Асфальтирование",
			"Брусчатка / бордюры",
			"Озеленение",
			"Детские площадки",
			"Освещение территории",
		],
	},
	{ name: "Прочие расходы" },
	{ name: "Документация" },
	{ name: "Дизайн" },
];

export function WbsPage() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<DialogState>(null);
	const [selectedNode, setSelectedNode] = useState<FlatWbsNode | null>(null);
	const [projectFilter, setProjectFilter] = useState<string>("all");
	const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("KGS");
	const [templateCreating, setTemplateCreating] = useState(false);
	const [templateClearing, setTemplateClearing] = useState(false);
	const [viewMode, setViewMode] = useState<WbsViewMode>(() => {
		if (typeof window === "undefined") return "wbs";
		const saved = localStorage.getItem(VIEW_STORAGE_KEY) as WbsViewMode | null;
		return saved && VIEW_OPTS.some((v) => v.id === saved) ? saved : "wbs";
	});

	const { data: projects = [] } = useQuery<ProjectOption[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const projectParams = projectFilter !== "all" ? { projectId: projectFilter } : undefined;

	const { data: stages = [], isLoading: stagesLoading } = useQuery<WbsStage[]>({
		queryKey: ["construction-stages", projectFilter],
		queryFn: () => api.get("/construction/stages", { params: projectParams }).then((r) => r.data),
	});

	const { data: expenses = [] } = useQuery<WbsExpenseRow[]>({
		queryKey: ["construction-expenses", projectFilter],
		queryFn: () =>
			api
				.get("/construction/expenses", { params: projectParams })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: tasks = [] } = useQuery<WbsTaskSummary[]>({
		queryKey: ["construction-tasks-wbs", projectFilter],
		queryFn: () =>
			api
				.get("/construction/tasks", { params: projectParams })
				.then((r) => (Array.isArray(r.data) ? r.data : [])),
	});

	const { data: nbkr, isLoading: nbkrLoading } = useQuery<NbkrResponse>({
		queryKey: ["nbkr-rates"],
		queryFn: () => api.get("/nbkr/rates").then((r) => r.data),
		staleTime: 60 * 60 * 1000,
	});

	const metricsById = useMemo(
		() => computeStageMetricsMap(stages, tasks, expenses),
		[stages, tasks, expenses],
	);

	const flat = useMemo(() => flattenWbsTree(stages, metricsById), [stages, metricsById]);

	const dashboard = useMemo(
		() => computeProjectDashboard(stages, flat, tasks),
		[stages, flat, tasks],
	);

	const projectMap = useMemo(
		() => Object.fromEntries(projects.map((p) => [p.id, p.name])),
		[projects],
	);

	const rates = nbkr?.rates || {};
	const fmt = (kgs: number) =>
		fmtCurrencyAmount(kgsToDisplay(kgs, displayCurrency, rates), displayCurrency);

	const isLoading = stagesLoading || nbkrLoading;
	const singleProjectId = projectFilter !== "all" ? Number(projectFilter) : null;
	const canReorder = singleProjectId != null && stages.length > 0;

	const handleViewChange = (mode: WbsViewMode) => {
		setViewMode(mode);
		localStorage.setItem(VIEW_STORAGE_KEY, mode);
	};

	const handleSelect = (stage: WbsStage) => {
		const node = flat.find((n) => n.id === stage.id) ?? null;
		setSelectedNode(node);
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Удалить этап WBS? Подэтапы могут остаться без родителя.")) return;
		await fetch(`${BASE}/construction/stages/${id}`, { method: "DELETE", headers: ah() });
		toast({ title: "Этап удалён" });
		setSelectedNode(null);
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
	};

	const handleReorder = async (items: { id: number; parentStageId: number | null }[]) => {
		if (!singleProjectId) return;
		try {
			const res = await fetch(`${BASE}/construction/stages/reorder`, {
				method: "POST",
				headers: ah(),
				body: JSON.stringify({ projectId: singleProjectId, items }),
			});
			if (!res.ok) throw new Error("reorder failed");
			qc.invalidateQueries({ queryKey: ["construction-stages"] });
		} catch {
			toast({ title: "Не удалось сохранить структуру WBS", variant: "destructive" });
		}
	};

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ["construction-stages"] });
		qc.invalidateQueries({ queryKey: ["construction-expenses"] });
		qc.invalidateQueries({ queryKey: ["construction-tasks-wbs"] });
	};

	const createStage = async ({
		projectId,
		parentStageId,
		name,
		sortOrder,
	}: {
		projectId: number;
		parentStageId: number | null;
		name: string;
		sortOrder: number;
	}) => {
		const res = await fetch(`${BASE}/construction/stages`, {
			method: "POST",
			headers: ah(),
			body: JSON.stringify({
				projectId,
				parentStageId,
				name,
				description: "",
				status: "not_started",
				progress: 0,
				startDate: "",
				plannedEndDate: "",
				budgetAmount: "",
				sortOrder,
			}),
		});
		if (!res.ok) throw new Error("stage create failed");
		return res.json() as Promise<WbsStage>;
	};

	const handleCreateDefaultStages = async () => {
		if (!singleProjectId) {
			toast({
				title: "Выберите проект",
				description: "Шаблон этапов создаётся внутри одного проекта.",
				variant: "destructive",
			});
			return;
		}
		if (stages.length > 0 && !confirm("В выбранном проекте уже есть этапы WBS. Добавить шаблон к существующей структуре?")) {
			return;
		}

		setTemplateCreating(true);
		try {
			let createdCount = 0;
			for (const [rootIndex, root] of DEFAULT_STAGE_TEMPLATE.entries()) {
				const parent = await createStage({
					projectId: singleProjectId,
					parentStageId: null,
					name: root.name,
					sortOrder: (rootIndex + 1) * 100,
				});
				createdCount += 1;

				for (const [childIndex, childName] of (root.children || []).entries()) {
					await createStage({
						projectId: singleProjectId,
						parentStageId: parent.id,
						name: childName,
						sortOrder: (childIndex + 1) * 100,
					});
					createdCount += 1;
				}
			}

			toast({
				title: "Шаблон WBS создан",
				description: `Добавлено ${createdCount} этапов и подэтапов.`,
			});
			invalidate();
		} catch {
			toast({
				title: "Не удалось создать шаблон WBS",
				description: "Часть этапов могла быть создана. Обновите страницу и проверьте структуру.",
				variant: "destructive",
			});
			invalidate();
		} finally {
			setTemplateCreating(false);
		}
	};

	const handleClearProjectStages = async () => {
		if (!singleProjectId) {
			toast({
				title: "Выберите проект",
				description: "Очистка этапов доступна только внутри одного проекта.",
				variant: "destructive",
			});
			return;
		}
		if (stages.length === 0) {
			toast({ title: "Этапов нет", description: "В выбранном проекте WBS уже пустая." });
			return;
		}

		const projectName = projectMap[singleProjectId] || "выбранного проекта";
		const taskCount = tasks.filter((t) => t.stageId != null).length;
		const expenseCount = expenses.filter((e) => e.stageId != null).length;
		const dependencyText =
			taskCount > 0 || expenseCount > 0
				? `\n\nВнимание: найдено связанных записей: задачи — ${taskCount}, расходы — ${expenseCount}. После удаления этапов они могут потерять привязку к WBS.`
				: "";
		if (
			!confirm(
				`Удалить все этапы и подэтапы WBS проекта «${projectName}»?${dependencyText}\n\nДействие нельзя отменить.`,
			)
		) {
			return;
		}

		setTemplateClearing(true);
		try {
			const ordered = [...flat].sort((a, b) => b.depth - a.depth || b.id - a.id);
			let deleted = 0;
			for (const node of ordered) {
				const res = await fetch(`${BASE}/construction/stages/${node.id}`, {
					method: "DELETE",
					headers: ah(),
				});
				if (!res.ok) throw new Error("stage delete failed");
				deleted += 1;
			}

			toast({
				title: "WBS очищена",
				description: `Удалено ${deleted} этапов и подэтапов.`,
			});
			setSelectedNode(null);
			invalidate();
		} catch {
			toast({
				title: "Не удалось полностью очистить WBS",
				description: "Часть этапов могла быть удалена. Обновите страницу и проверьте структуру.",
				variant: "destructive",
			});
			invalidate();
		} finally {
			setTemplateClearing(false);
		}
	};

	return (
		<div className="am-page space-y-5">
			<div className="am-page-header">
				<div>
					<h1 className="am-page-title text-2xl">План проекта (WBS)</h1>
					<p className="am-page-subtitle text-sm">
						Иерархия работ, прогресс, бюджет и управление строительным объектом
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<CurrencyToggle
						value={displayCurrency}
						onChange={setDisplayCurrency}
						rateLabel={displayCurrency === "USD" ? nbkrUsdRateLabel(rates) : null}
						nbkrDate={nbkr?.date}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={handleCreateDefaultStages}
						disabled={!singleProjectId || templateCreating || templateClearing}
						className="gap-2"
						title={!singleProjectId ? "Выберите один проект, чтобы создать шаблон WBS" : "Создать стандартный список этапов"}
					>
						{templateCreating ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Sparkles className="w-4 h-4" />
						)}
						{templateCreating ? "Создаю..." : "Шаблон этапов"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={handleClearProjectStages}
						disabled={!singleProjectId || stages.length === 0 || templateCreating || templateClearing}
						className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
						title={!singleProjectId ? "Выберите один проект, чтобы очистить WBS" : "Удалить все этапы выбранного проекта"}
					>
						{templateClearing ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Trash2 className="w-4 h-4" />
						)}
						{templateClearing ? "Очищаю..." : "Очистить этапы"}
					</Button>
					<Button onClick={() => setDialog("new")} className="bg-amber-500 hover:bg-orange-600 gap-2">
						<Plus className="w-4 h-4" /> Добавить этап
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Select value={projectFilter} onValueChange={setProjectFilter}>
					<SelectTrigger className="w-[220px] h-9">
						<SelectValue placeholder="Проект" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Все проекты</SelectItem>
						{projects.map((p) => (
							<SelectItem key={p.id} value={String(p.id)}>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
					{VIEW_OPTS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => handleViewChange(id)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
								viewMode === id ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-50"
							}`}
							title={label}
						>
							<Icon className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">{label}</span>
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-24 w-full rounded-xl" />
					<Skeleton className="h-40 w-full rounded-xl" />
				</div>
			) : (
				<>
					<WbsDashboard fmt={fmt} dashboard={dashboard} isLoading={false} />

					{viewMode === "wbs" && projectFilter === "all" && (
						<div className="rounded-[18px] border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 shadow-sm">
							Выберите один проект для drag & drop и редактирования иерархии WBS
						</div>
					)}

					{viewMode === "wbs" && (
						<WbsTreeView
							flat={flat}
							stages={stages}
							fmt={fmt}
							onSelect={handleSelect}
							onAddSub={(s) => setDialog({ parentStageId: s.id, projectId: s.projectId })}
							onReorder={handleReorder}
							reorderEnabled={canReorder}
						/>
					)}

					{viewMode === "cards" && (
						<WbsCardsView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}

					{viewMode === "table" && (
						<WbsTableView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}

					{viewMode === "gantt" && (
						<WbsGanttView flat={flat} fmt={fmt} onSelect={handleSelect} />
					)}
				</>
			)}

			<WbsStageDialog
				stage={dialog}
				projects={projects}
				parentStages={stages}
				onClose={() => setDialog(null)}
				onSaved={invalidate}
			/>

			<WbsStageDrawer
				open={!!selectedNode}
				node={selectedNode}
				projectName={
					selectedNode ? projectMap[selectedNode.stage.projectId] ?? `Проект #${selectedNode.stage.projectId}` : ""
				}
				tasks={tasks}
				fmt={fmt}
				onClose={() => setSelectedNode(null)}
				onEdit={(s) => {
					setDialog(s);
				}}
				onDelete={handleDelete}
				onAddSub={(s) => setDialog({ parentStageId: s.id, projectId: s.projectId })}
			/>
		</div>
	);
}

export { flatToReorderPayload };
