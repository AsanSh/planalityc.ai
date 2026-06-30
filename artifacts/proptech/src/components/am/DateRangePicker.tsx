/**
 * AM DateRangePicker — chip-style minimal period picker.
 * Same PeriodValue API. Preset chips apply immediately; custom range applies on blur.
 */
import { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PeriodPreset =
	| "today"
	| "yesterday"
	| "last7"
	| "last30"
	| "week"
	| "prev_week"
	| "month"
	| "prev_month"
	| "quarter"
	| "prev_quarter"
	| "year"
	| "prev_year"
	| "all"
	| "custom";

export interface PeriodValue {
	preset: PeriodPreset;
	from: string;
	to: string;
}

const MONTHS_FULL = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTHS_GEN = [
	"янв", "фев", "мар", "апр", "май", "июн",
	"июл", "авг", "сен", "окт", "ноя", "дек",
];

function iso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

function fmtShort(s: string): string {
	if (!s) return "-";
	const d = parseISO(s);
	return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

function weekStartMonday(d: Date): Date {
	const start = new Date(d);
	const day = start.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	start.setDate(start.getDate() + diff);
	return start;
}

export function getPresetRange(preset: PeriodPreset, now = new Date()): { from: string; to: string } {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	switch (preset) {
		case "today":
			return { from: iso(today), to: iso(today) };
		case "yesterday": {
			const y = new Date(today);
			y.setDate(y.getDate() - 1);
			return { from: iso(y), to: iso(y) };
		}
		case "last7": {
			const from = new Date(today);
			from.setDate(from.getDate() - 6);
			return { from: iso(from), to: iso(today) };
		}
		case "last30": {
			const from = new Date(today);
			from.setDate(from.getDate() - 29);
			return { from: iso(from), to: iso(today) };
		}
		case "week": {
			const start = weekStartMonday(today);
			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			return { from: iso(start), to: iso(end) };
		}
		case "prev_week": {
			const start = weekStartMonday(today);
			start.setDate(start.getDate() - 7);
			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			return { from: iso(start), to: iso(end) };
		}
		case "month": {
			const from = new Date(today.getFullYear(), today.getMonth(), 1);
			const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_month": {
			const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
			const to = new Date(today.getFullYear(), today.getMonth(), 0);
			return { from: iso(from), to: iso(to) };
		}
		case "quarter": {
			const q = Math.floor(today.getMonth() / 3);
			const from = new Date(today.getFullYear(), q * 3, 1);
			const to = new Date(today.getFullYear(), q * 3 + 3, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_quarter": {
			const q = Math.floor(today.getMonth() / 3) - 1;
			const year = q < 0 ? today.getFullYear() - 1 : today.getFullYear();
			const qq = q < 0 ? 3 : q;
			const from = new Date(year, qq * 3, 1);
			const to = new Date(year, qq * 3 + 3, 0);
			return { from: iso(from), to: iso(to) };
		}
		case "year": {
			const from = new Date(today.getFullYear(), 0, 1);
			const to = new Date(today.getFullYear(), 11, 31);
			return { from: iso(from), to: iso(to) };
		}
		case "prev_year": {
			const y = today.getFullYear() - 1;
			return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
		}
		case "all":
			return { from: "2000-01-01", to: iso(today) };
		case "custom":
		default: {
			const from = new Date(today.getFullYear(), today.getMonth(), 1);
			return { from: iso(from), to: iso(today) };
		}
	}
}

export function defaultPeriod(preset: PeriodPreset = "month"): PeriodValue {
	const r = getPresetRange(preset);
	return { preset, ...r };
}

export function inPeriod(date: string | undefined | null, period: PeriodValue): boolean {
	if (!date) return false;
	const d = String(date).slice(0, 10);
	return d >= period.from && d <= period.to;
}

function periodLabel(p: PeriodValue): string {
	if (p.preset === "today") return "Сегодня";
	if (p.preset === "yesterday") return "Вчера";
	if (p.preset === "last7") return "Последние 7 дней";
	if (p.preset === "last30") return "Последние 30 дней";
	if (p.preset === "week") return "Текущая неделя";
	if (p.preset === "prev_week") return "Прошлая неделя";
	if (p.preset === "all") return "Всё время";
	if (p.preset === "month") {
		const d = parseISO(p.from);
		return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
	}
	if (p.preset === "prev_month") {
		const d = parseISO(p.from);
		return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
	}
	if (p.preset === "quarter") {
		const d = parseISO(p.from);
		const q = Math.floor(d.getMonth() / 3) + 1;
		return `${q} кв. ${d.getFullYear()}`;
	}
	if (p.preset === "prev_quarter") {
		const d = parseISO(p.from);
		const q = Math.floor(d.getMonth() / 3) + 1;
		return `${q} кв. ${d.getFullYear()}`;
	}
	if (p.preset === "year") return `${parseISO(p.from).getFullYear()} год`;
	if (p.preset === "prev_year") return `${parseISO(p.from).getFullYear()} год`;
	return `${fmtShort(p.from)} — ${fmtShort(p.to)}`;
}

const CHIP_PRESETS: { key: PeriodPreset; label: string }[] = [
	{ key: "month",        label: "Текущий месяц" },
	{ key: "quarter",      label: "Текущий квартал" },
	{ key: "year",         label: "Текущий год" },
	{ key: "prev_month",   label: "Прошлый месяц" },
	{ key: "prev_quarter", label: "Прошлый квартал" },
	{ key: "prev_year",    label: "Прошлый год" },
	{ key: "all",          label: "Всё время" },
];

export interface DateRangePickerProps {
	value: PeriodValue;
	onChange: (v: PeriodValue) => void;
	hideShift?: boolean;
	className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const [fromInput, setFromInput] = useState(value.from);
	const [toInput, setToInput] = useState(value.to);

	useEffect(() => {
		if (open) {
			setFromInput(value.from);
			setToInput(value.to);
		}
	}, [open, value.from, value.to]);

	const applyPreset = (preset: PeriodPreset) => {
		const r = getPresetRange(preset);
		onChange({ preset, ...r });
		setOpen(false);
	};

	const applyCustom = (from: string, to: string) => {
		if (from && to && from <= to) {
			onChange({ preset: "custom", from, to });
		}
	};

	const reset = (e: { stopPropagation(): void }) => {
		e.stopPropagation();
		onChange(defaultPeriod("month"));
	};

	const isDefault = value.preset === "month" &&
		value.from === getPresetRange("month").from &&
		value.to === getPresetRange("month").to;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"h-9 pl-3 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors whitespace-nowrap shrink-0",
						isDefault ? "pr-3" : "pr-2",
						className,
					)}
				>
					<CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
					<span>{periodLabel(value)}</span>
					{!isDefault && (
						<span
							role="button"
							aria-label="Сбросить период"
							onClick={reset}
							className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600"
						>
							<X className="w-3 h-3" />
						</span>
					)}
				</button>
			</PopoverTrigger>

			<PopoverContent className="w-[300px] p-4 space-y-3" align="start">
				{/* Date range inputs */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<input
							type="date"
							value={fromInput}
							onChange={(e) => setFromInput(e.target.value)}
							onBlur={() => applyCustom(fromInput, toInput)}
							className="w-full h-9 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
						/>
						<CalendarDays className="absolute right-2 top-2.5 w-4 h-4 text-gray-300 pointer-events-none" />
					</div>
					<span className="text-gray-400 text-sm shrink-0">—</span>
					<div className="relative flex-1">
						<input
							type="date"
							value={toInput}
							onChange={(e) => setToInput(e.target.value)}
							onBlur={() => applyCustom(fromInput, toInput)}
							className="w-full h-9 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
						/>
						<CalendarDays className="absolute right-2 top-2.5 w-4 h-4 text-gray-300 pointer-events-none" />
					</div>
				</div>

				{/* Preset chips */}
				<div className="grid grid-cols-2 gap-1.5">
					{CHIP_PRESETS.map(({ key, label }) => {
						const active = value.preset === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => applyPreset(key)}
								className={cn(
									"h-8 px-3 text-sm rounded-full border text-left transition-colors",
									active
										? "border-emerald-500 text-emerald-700 bg-emerald-50 font-medium"
										: "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
									key === "all" && "col-span-2",
								)}
							>
								{label}
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

/** Stub kept for backward compat — no longer needed with chip trigger. */
export function ClearPeriodButton({ onClear }: { onClear: () => void }) {
	return (
		<button
			type="button"
			onClick={onClear}
			className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
			aria-label="Сбросить период"
		>
			<X className="w-4 h-4" />
		</button>
	);
}
