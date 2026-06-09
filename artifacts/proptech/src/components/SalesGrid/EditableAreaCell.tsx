import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function fmtArea(v: string | null | undefined) {
	if (!v) return "—";
	return `${new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 2 }).format(parseFloat(v))} м²`;
}

export function EditableAreaCell({
	area,
	editable,
	onSave,
}: {
	area?: string | null;
	editable: boolean;
	onSave: (value: number) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) {
			setDraft(area ? String(parseFloat(area)) : "");
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [editing, area]);

	const cancel = () => {
		setEditing(false);
		setDraft("");
	};

	const save = async () => {
		const val = parseFloat(draft.replace(",", "."));
		if (!val || val <= 0) {
			cancel();
			return;
		}
		const prev = parseFloat(area || "0");
		if (Math.abs(val - prev) < 0.001) {
			cancel();
			return;
		}
		setSaving(true);
		try {
			await onSave(val);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	if (!editable) {
		return <span className="tabular-nums">{fmtArea(area)}</span>;
	}

	if (editing) {
		return (
			<div
				className="flex items-center gap-1 min-w-[100px]"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<Input
					ref={inputRef}
					type="text"
					inputMode="decimal"
					className="h-7 w-20 text-xs font-mono tabular-nums"
					value={draft}
					disabled={saving}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") void save();
						if (e.key === "Escape") cancel();
					}}
					onBlur={() => void save()}
				/>
				<span className="text-[10px] text-slate-400">м²</span>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={cn(
				"group inline-flex items-center gap-1 rounded px-1 -mx-1 tabular-nums",
				"hover:bg-amber-50 hover:text-amber-900",
				!area && "text-slate-400 italic",
			)}
			title="Изменить площадь"
			onClick={(e) => {
				e.stopPropagation();
				setEditing(true);
			}}
		>
			{fmtArea(area)}
			<Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />
		</button>
	);
}
