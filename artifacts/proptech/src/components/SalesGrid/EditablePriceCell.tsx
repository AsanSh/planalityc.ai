import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPriceSom, parseNum } from "@/lib/unit-pricing";
import { cn } from "@/lib/utils";

export function EditablePriceCell({
	price,
	editable,
	onSave,
}: {
	price: number;
	editable: boolean;
	onSave: (value: number) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!editing) return;
		setDraft(price > 0 ? String(price) : "");
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [editing, price]);

	const cancel = () => {
		setEditing(false);
		setDraft("");
	};

	const save = async () => {
		const nextPrice = parseNum(draft);
		if (!nextPrice || nextPrice <= 0) {
			cancel();
			return;
		}
		if (Math.abs(nextPrice - price) < 0.001) {
			cancel();
			return;
		}
		setSaving(true);
		try {
			await onSave(nextPrice);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	if (!editable) {
		return (
			<span className="block text-right font-mono tabular-nums">
				{formatPriceSom(price)}
			</span>
		);
	}

	if (editing) {
		return (
			<div
				className="ml-auto flex min-w-[132px] items-center justify-end gap-1"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<Input
					ref={inputRef}
					type="text"
					inputMode="decimal"
					className="h-7 w-24 text-right font-mono text-xs tabular-nums"
					value={draft}
					disabled={saving}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") void save();
						if (event.key === "Escape") cancel();
					}}
					onBlur={() => void save()}
				/>
				<span className="text-[10px] text-slate-400">сом</span>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={cn(
				"group ml-auto flex items-center justify-end gap-1 rounded px-1 text-right font-mono tabular-nums",
				"hover:bg-amber-50 hover:text-amber-900",
				price <= 0 && "italic text-slate-400",
			)}
			title="Изменить цену за м²"
			onClick={(event) => {
				event.stopPropagation();
				setEditing(true);
			}}
		>
			{formatPriceSom(price)}
			<Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" />
		</button>
	);
}
