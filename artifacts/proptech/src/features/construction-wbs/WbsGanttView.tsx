import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { inferStageStatus, statusMeta } from "./status";
import type { FlatWbsNode, WbsStage } from "./types";

type Scale = "day" | "week" | "month" | "quarter" | "year";

const SCALE_LABELS: Array<{ value: Scale; label: string }> = [
	{ value: "day", label: "День" },
	{ value: "week", label: "Неделя" },
	{ value: "month", label: "Месяц" },
	{ value: "quarter", label: "Квартал" },
	{ value: "year", label: "Год" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value?: string | null) {
	if (!value) return null;
	const d = new Date(String(value).slice(0, 10));
	return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function startOfDay(date: Date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function startOfWeek(date: Date) {
	const d = startOfDay(date);
	const day = d.getDay() || 7;
	d.setDate(d.getDate() - day + 1);
	return d;
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date: Date) {
	return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function startOfYear(date: Date) {
	return new Date(date.getFullYear(), 0, 1);
}

function diffDays(a: Date, b: Date) {
	return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS));
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	}).format(date);
}

function formatTick(date: Date, scale: Scale) {
	if (scale === "day") {
		return new Intl.DateTimeFormat("ru-KG", { day: "2-digit", month: "short" }).format(date);
	}
	if (scale === "week") {
		return `нед. ${getWeekNumber(date)}`;
	}
	if (scale === "month") {
		return new Intl.DateTimeFormat("ru-KG", { month: "short", year: "2-digit" }).format(date);
	}
	if (scale === "quarter") {
		return `${Math.floor(date.getMonth() / 3) + 1} кв. ${date.getFullYear()}`;
	}
	return String(date.getFullYear());
}

function getWeekNumber(date: Date) {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function getUnitWidth(scale: Scale) {
	if (scale === "day") return 42;
	if (scale === "week") return 14;
	if (scale === "month") return 5.8;
	if (scale === "quarter") return 2.6;
	return 1.2;
}

function getTimelineStart(date: Date, scale: Scale) {
	if (scale === "day") return addDays(startOfDay(date), -1);
	if (scale === "week") return addDays(startOfWeek(date), -7);
	if (scale === "month") return startOfMonth(date);
	if (scale === "quarter") return startOfQuarter(date);
	return startOfYear(date);
}

function getTimelineEnd(date: Date, scale: Scale) {
	if (scale === "day") return addDays(startOfDay(date), 2);
	if (scale === "week") return addDays(startOfWeek(date), 14);
	if (scale === "month") return addDays(startOfMonth(new Date(date.getFullYear(), date.getMonth() + 1, 1)), 7);
	if (scale === "quarter") return addDays(startOfQuarter(new Date(date.getFullYear(), date.getMonth() + 3, 1)), 21);
	return new Date(date.getFullYear() + 1, 0, 1);
}

function buildTicks(start: Date, end: Date, scale: Scale) {
	const ticks: Date[] = [];
	let cursor =
		scale === "day"
			? startOfDay(start)
			: scale === "week"
				? startOfWeek(start)
				: scale === "month"
					? startOfMonth(start)
					: scale === "quarter"
						? startOfQuarter(start)
						: startOfYear(start);
	while (cursor <= end) {
		ticks.push(new Date(cursor));
		if (scale === "day") cursor = addDays(cursor, 1);
		else if (scale === "week") cursor = addDays(cursor, 7);
		else if (scale === "month") cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
		else if (scale === "quarter") cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1);
		else cursor = new Date(cursor.getFullYear() + 1, 0, 1);
	}
	return ticks;
}

export function WbsGanttView({
	flat,
	fmt,
	onSelect,
}: {
	flat: FlatWbsNode[];
	fmt: (kgs: number) => string;
	onSelect: (s: WbsStage) => void;
}) {
	const [scale, setScale] = useState<Scale>("month");

	const gantt = useMemo(() => {
		const rows = flat
			.map((node) => {
				const start = parseDate(node.stage.startDate || node.stage.createdAt);
				const end = parseDate(node.stage.plannedEndDate || node.stage.actualEndDate || node.stage.startDate);
				if (!start || !end) return null;
				const normalizedEnd = end < start ? start : end;
				const st = inferStageStatus(node.stage, node.metrics);
				const meta = statusMeta(st);
				return {
					node,
					start,
					end: normalizedEnd,
					duration: diffDays(start, normalizedEnd) + 1,
					progress: Math.max(0, Math.min(100, node.metrics.effectiveProgress || node.stage.progress || 0)),
					factPct: node.metrics.factPct,
					status: st,
					meta,
				};
			})
			.filter(Boolean) as Array<{
			node: FlatWbsNode;
			start: Date;
			end: Date;
			duration: number;
			progress: number;
			factPct: number;
			status: string;
			meta: ReturnType<typeof statusMeta>;
		}>;

		if (!rows.length) return null;

		const min = rows.reduce((m, row) => (row.start < m ? row.start : m), rows[0].start);
		const max = rows.reduce((m, row) => (row.end > m ? row.end : m), rows[0].end);
		const start = getTimelineStart(min, scale);
		const end = getTimelineEnd(max, scale);
		const totalDays = Math.max(1, diffDays(start, end) + 1);
		const unitWidth = getUnitWidth(scale);
		const width = Math.max(720, totalDays * unitWidth);
		const ticks = buildTicks(start, end, scale);
		const today = startOfDay(new Date());
		const todayLeft =
			today >= start && today <= end ? (diffDays(start, today) / totalDays) * width : null;

		return { rows, start, end, totalDays, unitWidth, width, ticks, todayLeft };
	}, [flat, scale]);

	if (!gantt) {
		return (
			<div className="rounded-[22px] border border-am-border bg-white py-12 text-center text-sm text-am-text-muted shadow-sm">
				Укажите даты начала и окончания этапов для диаграммы Ганта
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-[24px] border border-am-border bg-white shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-am-border px-4 py-3">
				<div>
					<p className="text-sm font-bold text-am-text-strong">План-график WBS</p>
					<p className="text-xs text-am-text-muted">
						Этапы, подэтапы, прогресс и календарный план работ
					</p>
				</div>
				<div className="flex rounded-xl border border-am-border bg-slate-50 p-1">
					{SCALE_LABELS.map((item) => (
						<button
							key={item.value}
							type="button"
							onClick={() => setScale(item.value)}
							className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
								scale === item.value
									? "bg-slate-950 text-white shadow-sm"
									: "text-slate-500 hover:bg-white hover:text-slate-900"
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			<div className="grid min-h-[520px] grid-cols-[minmax(560px,42%)_1fr] overflow-hidden max-xl:grid-cols-1">
				<div className="border-r border-am-border bg-white max-xl:border-r-0 max-xl:border-b">
					<div className="grid h-12 grid-cols-[minmax(220px,1fr)_88px_104px_104px_72px] items-center border-b border-am-border bg-slate-950 px-3 text-[11px] font-bold uppercase tracking-wide text-white/70">
						<span>Этапы / подэтапы</span>
						<span className="text-right">Прогресс</span>
						<span className="text-right">Дата начала</span>
						<span className="text-right">Завершение</span>
						<span className="text-right">Дней</span>
					</div>
					<div>
						{gantt.rows.map((row) => {
							const isRoot = row.node.depth === 0;
							return (
								<button
									key={row.node.id}
									type="button"
									onClick={() => onSelect(row.node.stage)}
									className={`grid h-12 w-full grid-cols-[minmax(220px,1fr)_88px_104px_104px_72px] items-center border-b border-slate-100 px-3 text-left transition hover:bg-cyan-50/70 ${
										isRoot ? "bg-slate-50/80" : "bg-white"
									}`}
								>
									<span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: row.node.depth * 18 }}>
										<span
											className={`h-2.5 w-2.5 shrink-0 rounded-full ${
												row.status === "completed"
													? "bg-emerald-500"
													: row.status === "behind" || row.status === "over_budget"
														? "bg-rose-500"
														: row.status === "at_risk"
															? "bg-amber-500"
															: "bg-cyan-600"
											}`}
										/>
										<span className="shrink-0 font-mono text-[11px] text-slate-400">
											{row.node.wbsCode}
										</span>
										<span className={`truncate text-sm ${isRoot ? "font-bold text-slate-950" : "font-medium text-slate-700"}`}>
											{row.node.stage.name}
										</span>
									</span>
									<span className="text-right font-mono text-xs font-semibold text-slate-800">
										{row.progress}%
									</span>
									<span className="text-right text-xs text-slate-500">{formatDate(row.start)}</span>
									<span className="text-right text-xs text-slate-500">{formatDate(row.end)}</span>
									<span className="text-right font-mono text-xs text-slate-700">{row.duration}</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="min-w-0 overflow-x-auto bg-slate-50/60">
					<div style={{ width: gantt.width }} className="relative">
						<div className="sticky top-0 z-10 h-12 border-b border-am-border bg-white">
							{gantt.ticks.map((tick) => {
								const left = (diffDays(gantt.start, tick) / gantt.totalDays) * gantt.width;
								return (
									<div
										key={tick.toISOString()}
										className="absolute top-0 flex h-12 items-center border-l border-slate-200 pl-2 text-[11px] font-semibold text-slate-500"
										style={{ left, width: Math.max(84, gantt.unitWidth * (scale === "day" ? 1 : scale === "week" ? 7 : scale === "month" ? 30 : scale === "quarter" ? 90 : 365)) }}
									>
										{formatTick(tick, scale)}
									</div>
								);
							})}
						</div>

						<div className="absolute inset-y-12 left-0 right-0 pointer-events-none">
							{gantt.ticks.map((tick) => {
								const left = (diffDays(gantt.start, tick) / gantt.totalDays) * gantt.width;
								return (
									<div
										key={`grid-${tick.toISOString()}`}
										className="absolute top-0 h-full border-l border-slate-200/75"
										style={{ left }}
									/>
								);
							})}
							{gantt.todayLeft != null && (
								<div
									className="absolute top-0 h-full border-l-2 border-cyan-500/80"
									style={{ left: gantt.todayLeft }}
								>
									<span className="absolute -top-5 -translate-x-1/2 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white">
										Сегодня
									</span>
								</div>
							)}
						</div>

						<div>
							{gantt.rows.map((row) => {
								const left = (diffDays(gantt.start, row.start) / gantt.totalDays) * gantt.width;
								const barWidth = Math.max(18, ((diffDays(row.start, row.end) + 1) / gantt.totalDays) * gantt.width);
								const isRoot = row.node.depth === 0;
								const color =
									row.status === "over_budget" || row.status === "behind"
										? "bg-rose-500"
										: row.status === "at_risk"
											? "bg-amber-500"
											: row.status === "completed"
												? "bg-emerald-500"
												: "bg-cyan-600";
								return (
									<button
										key={`bar-${row.node.id}`}
										type="button"
										onClick={() => onSelect(row.node.stage)}
										className={`relative block h-12 w-full border-b border-slate-100 text-left transition hover:bg-cyan-50/60 ${
											isRoot ? "bg-white/70" : "bg-white/40"
										}`}
									>
										<div
											className={`absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full shadow-sm ${
												isRoot ? "h-6" : ""
											} bg-slate-200`}
											style={{ left, width: barWidth }}
											title={`${row.node.stage.name}: ${formatDate(row.start)} - ${formatDate(row.end)}`}
										>
											<div className={`h-full ${color}`} style={{ width: `${row.progress}%` }} />
										</div>
										<div
											className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-2 text-xs font-semibold text-slate-700"
											style={{ left: left + barWidth }}
										>
											{isRoot && row.node.stage.name} {row.progress}%
											{row.node.metrics.budgetKgs > 0 && (
												<span className="ml-2 text-[11px] font-medium text-slate-400">
													{fmt(row.node.metrics.spentKgs)}
												</span>
											)}
										</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 border-t border-am-border px-4 py-2 text-[11px] text-slate-500">
				<span className="inline-flex items-center gap-1">
					<CalendarDays className="h-3.5 w-3.5" /> Полоса показывает календарную длительность
				</span>
				<span>Заливка внутри полосы — прогресс работ</span>
				<span>Бюджет в подписи — освоение по расходам этапа</span>
			</div>
		</div>
	);
}
