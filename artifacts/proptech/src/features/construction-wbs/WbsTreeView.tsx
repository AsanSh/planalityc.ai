import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { inferStageStatus, statusMeta } from "./status";
import {
	WBS_INDENT_PX,
	flatToReorderPayload,
	projectTreeMove,
} from "./tree";
import type { FlatWbsNode, WbsStage } from "./types";

function ProgressBar({ value, className }: { value: number; className?: string }) {
	const v = Math.min(100, Math.max(0, value));
	return (
		<div className={`flex items-center gap-2 min-w-[120px] ${className ?? ""}`}>
			<Progress value={v} className="h-1.5 flex-1 bg-gray-100 [&>div]:bg-amber-500" />
			<span className="text-[10px] font-semibold tabular-nums text-gray-600 w-8 text-right">
				{v}%
			</span>
		</div>
	);
}

function WbsRowContent({
	node,
	fmt,
	onSelect,
	onAddSub,
	isOverlay,
	isExpanded,
	onToggleExpanded,
	showChildrenControl,
}: {
	node: FlatWbsNode;
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	isOverlay?: boolean;
	isExpanded?: boolean;
	onToggleExpanded?: () => void;
	showChildrenControl?: boolean;
}) {
	const st = inferStageStatus(node.stage, node.metrics);
	const meta = statusMeta(st);
	const behind = st === "behind";

	return (
		<div
			className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1 min-w-0 py-3 pr-3 ${
				isOverlay ? "bg-white shadow-lg rounded-xl border border-amber-200 px-3" : ""
			}`}
			onClick={() => onSelect(node.stage)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onSelect(node.stage);
			}}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{showChildrenControl ? (
					<button
						type="button"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-am-border bg-white text-am-text-muted shadow-sm hover:border-am-brand/40 hover:text-am-brand"
						title={isExpanded ? "Скрыть подэтапы" : "Показать подэтапы"}
						onClick={(e) => {
							e.stopPropagation();
							onToggleExpanded?.();
						}}
					>
						{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
					</button>
				) : (
					<span className="h-7 w-7 shrink-0" />
				)}
				<span className="w-12 shrink-0 rounded-lg bg-am-brand-surface px-2 py-1 text-center font-mono text-[11px] font-semibold text-am-brand">
					{node.wbsCode}
				</span>
				<p className={`truncate text-sm font-semibold ${behind ? "text-rose-800" : "text-am-text-strong"}`}>
					{node.stage.name}
				</p>
				<span className={`hidden md:inline-flex text-[10px] px-1.5 py-0.5 rounded border ${meta.badge}`}>
					{meta.label}
				</span>
			</div>
			<div className="hidden lg:block w-36 shrink-0">
				<ProgressBar value={node.metrics.effectiveProgress} />
			</div>
			<div className="hidden xl:flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
				<span>
					Бюджет: <span className="font-semibold text-gray-800">{fmt(node.metrics.budgetKgs)}</span>
				</span>
				<span>
					Освоено: <span className="font-semibold text-amber-700">{fmt(node.metrics.spentKgs)}</span>
				</span>
				<span>
					Остаток:{" "}
					<span
						className={`font-semibold ${
							node.metrics.remainderKgs >= 0 ? "text-emerald-700" : "text-rose-700"
						}`}
					>
						{fmt(node.metrics.remainderKgs)}
					</span>
				</span>
			</div>
			<div className="flex items-center gap-2 text-[10px] text-gray-500 shrink-0">
				<span>Задачи: {node.metrics.taskCount}</span>
				{node.metrics.issueCount > 0 && (
					<span className="text-rose-600 font-semibold">Проблемы: {node.metrics.issueCount}</span>
				)}
				{node.childrenCount > 0 && (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-gray-600">
						Подэтапы: {node.childrenCount}
					</span>
				)}
			</div>
			{!isOverlay && (
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100"
					title="Добавить подэтап"
					onClick={(e) => {
						e.stopPropagation();
						onAddSub(node.stage);
					}}
				>
					<Plus className="w-3.5 h-3.5" />
				</Button>
			)}
		</div>
	);
}


function SortableRow({
	node,
	isExpanded,
	showChildrenControl,
	onToggleExpanded,
	overId,
	activeId,
	projectedDepth,
	fmt,
	onSelect,
	onAddSub,
	reorderEnabled,
}: {
	node: FlatWbsNode;
	isExpanded: boolean;
	showChildrenControl: boolean;
	onToggleExpanded: () => void;
	overId: number | null;
	activeId: number | null;
	projectedDepth: number | null;
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	reorderEnabled: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: node.id,
		disabled: !reorderEnabled,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const displayDepth =
		activeId != null && overId === node.id && projectedDepth != null ? projectedDepth : node.depth;
	const showProjection = activeId != null && overId === node.id && projectedDepth != null;

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-wbs-id={node.id}
			className={`am-table-row group relative flex items-stretch ${
				isDragging ? "opacity-30" : "hover:bg-am-brand-surface/70"
			}`}
		>
			{showProjection && (
				<div
					className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none"
					style={{ marginLeft: 12 + projectedDepth * WBS_INDENT_PX }}
				/>
			)}
			<div
				className="flex items-center shrink-0 pl-2 transition-[padding] duration-75"
				style={{ paddingLeft: 8 + displayDepth * WBS_INDENT_PX }}
			>
				<button
					type="button"
					className={`p-1 touch-none ${
						reorderEnabled
							? "cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
							: "cursor-default text-gray-200"
					}`}
					{...(reorderEnabled ? { ...attributes, ...listeners } : {})}
					onClick={(e) => e.stopPropagation()}
					disabled={!reorderEnabled}
				>
					<GripVertical className="w-4 h-4" />
				</button>
			</div>
			<WbsRowContent
				node={node}
				fmt={fmt}
				onSelect={onSelect}
				onAddSub={onAddSub}
				isExpanded={isExpanded}
				onToggleExpanded={onToggleExpanded}
				showChildrenControl={showChildrenControl}
			/>
		</div>
	);
}

export function WbsTreeView({
	flat,
	stages,
	fmt,
	onSelect,
	onAddSub,
	onReorder,
	reorderEnabled = true,
}: {
	flat: FlatWbsNode[];
	stages: WbsStage[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
	onAddSub: (s: WbsStage) => void;
	onReorder: (items: { id: number; parentStageId: number | null }[]) => Promise<void>;
	reorderEnabled?: boolean;
}) {
	const [activeId, setActiveId] = useState<number | null>(null);
	const [overId, setOverId] = useState<number | null>(null);
	const [projectedDepth, setProjectedDepth] = useState<number | null>(null);
	const [dragStartDepth, setDragStartDepth] = useState(0);
	const [showAll, setShowAll] = useState(false);
	const [expandedRoots, setExpandedRoots] = useState<Set<number>>(() => new Set());

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const rootByNodeId = useMemo(() => {
		const map = new Map<number, number>();
		let currentRootId: number | null = null;
		for (const node of flat) {
			if (node.depth === 0) currentRootId = node.id;
			if (currentRootId != null) map.set(node.id, currentRootId);
		}
		return map;
	}, [flat]);

	const visibleFlat = useMemo(() => {
		if (showAll) return flat;
		return flat.filter((node) => {
			if (node.depth === 0) return true;
			const rootId = rootByNodeId.get(node.id);
			return rootId != null && expandedRoots.has(rootId);
		});
	}, [expandedRoots, flat, rootByNodeId, showAll]);

	const ids = useMemo(() => visibleFlat.map((n) => n.id), [visibleFlat]);
	const activeNode = activeId != null ? flat.find((n) => n.id === activeId) : null;
	const rootCount = flat.filter((node) => node.depth === 0).length;

	const toggleRoot = (rootId: number) => {
		setExpandedRoots((prev) => {
			const next = new Set(prev);
			if (next.has(rootId)) next.delete(rootId);
			else next.add(rootId);
			return next;
		});
	};

	const handleDragStart = (e: DragStartEvent) => {
		if (!reorderEnabled) return;
		const id = Number(e.active.id);
		setActiveId(id);
		const node = flat.find((n) => n.id === id);
		setDragStartDepth(node?.depth ?? 0);
		setProjectedDepth(node?.depth ?? 0);
	};

	const handleDragMove = (e: DragMoveEvent) => {
		if (!reorderEnabled) return;
		const depthDelta = Math.round(e.delta.x / WBS_INDENT_PX);
		setProjectedDepth(Math.max(0, dragStartDepth + depthDelta));
	};

	const handleDragOver = (e: DragOverEvent) => {
		setOverId(e.over ? Number(e.over.id) : null);
	};

	const handleDragEnd = async (e: DragEndEvent) => {
		if (!reorderEnabled) return;
		const targetOverId = e.over ? Number(e.over.id) : null;
		const fromId = activeId;
		const depth = projectedDepth ?? dragStartDepth;

		setActiveId(null);
		setOverId(null);
		setProjectedDepth(null);

		if (fromId == null || targetOverId == null || fromId === targetOverId) return;

		const nextFlat = projectTreeMove(stages, flat, fromId, targetOverId, depth);
		if (!nextFlat) return;
		await onReorder(flatToReorderPayload(nextFlat));
	};

	return (
		<div className="am-card overflow-hidden rounded-[24px] border border-am-border bg-white/90">
			<div className="flex flex-col gap-3 border-b border-am-border bg-am-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p className="text-sm font-semibold text-am-text-strong">Структура WBS</p>
					<p className="text-xs text-am-text-muted">
						Показано {visibleFlat.length} из {flat.length} · основных этапов: {rootCount}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 gap-2 rounded-xl bg-white"
					onClick={() => setShowAll((v) => !v)}
				>
					{showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					{showAll ? "Свернуть подэтапы" : "Показать все"}
				</Button>
			</div>
			<div className="hidden border-b border-am-border bg-am-table-head px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] md:grid md:grid-cols-[1fr_9rem_12rem_8rem] gap-2">
				<span>Этап / подэтап</span>
				<span>Прогресс</span>
				<span>Бюджет / освоение</span>
				<span>Задачи</span>
			</div>
			<p className="md:hidden px-3 py-1.5 text-[10px] text-gray-600 border-b border-gray-100">
				Перетащите влево/вправо для смены уровня вложенности
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragOver={handleDragOver}
				onDragEnd={(e) => void handleDragEnd(e)}
				onDragCancel={() => {
					setActiveId(null);
					setOverId(null);
					setProjectedDepth(null);
				}}
			>
				<SortableContext items={ids} strategy={verticalListSortingStrategy}>
					{visibleFlat.map((node) => {
						const rootId = rootByNodeId.get(node.id) ?? node.id;
						const isRoot = node.depth === 0;
						const isExpanded = showAll || expandedRoots.has(rootId);
						return (
						<SortableRow
							key={node.id}
							node={node}
							isExpanded={isExpanded}
							showChildrenControl={!showAll && isRoot && node.childrenCount > 0}
							onToggleExpanded={() => toggleRoot(rootId)}
							overId={overId}
							activeId={activeId}
							projectedDepth={projectedDepth}
							fmt={fmt}
							onSelect={onSelect}
							onAddSub={onAddSub}
							reorderEnabled={reorderEnabled}
						/>
						);
					})}
				</SortableContext>
				<DragOverlay>
					{activeNode ? (
						<div className="flex items-center pl-10">
							<WbsRowContent
								node={activeNode}
								fmt={fmt}
								onSelect={() => {}}
								onAddSub={() => {}}
								isOverlay
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}
