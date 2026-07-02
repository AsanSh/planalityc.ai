import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

export const SPEC_TYPES: { value: string; label: string }[] = [
	{ value: "area", label: "Площадь" },
	{ value: "wet_points", label: "Мокрые точки" },
	{ value: "doors", label: "Двери" },
	{ value: "layout", label: "Планировка" },
	{ value: "other", label: "Другое" },
];
const SPEC_LABEL = Object.fromEntries(SPEC_TYPES.map((s) => [s.value, s.label]));

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
	pending: { label: "На рассмотрении", cls: "bg-amber-100 text-amber-800" },
	in_progress: { label: "Принято в работу", cls: "bg-emerald-100 text-emerald-800" },
	rejected: { label: "Отклонено", cls: "bg-rose-100 text-rose-700" },
	done: { label: "Выполнено", cls: "bg-slate-200 text-slate-700" },
};

interface ChangeRequest {
	id: number;
	specType: string;
	currentValue: string | null;
	requestedValue: string;
	comment: string | null;
	status: string;
	requestedByName: string | null;
	reviewedByName: string | null;
	reviewComment: string | null;
	reviewedAt: string | null;
	createdAt: string;
}

const fmt = (d?: string | null) =>
	d ? new Date(d).toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export function UnitChangeRequests({ unitId }: { unitId: number }) {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [specType, setSpecType] = useState("area");
	const [requestedValue, setRequestedValue] = useState("");
	const [currentValue, setCurrentValue] = useState("");
	const [comment, setComment] = useState("");

	const key = ["unit-change-requests", unitId];
	const { data: requests = [] } = useQuery<ChangeRequest[]>({
		queryKey: key,
		queryFn: () => api.get(`/construction/units/${unitId}/change-requests`).then((r) => r.data),
	});

	const create = useMutation({
		mutationFn: () =>
			api.post(`/construction/units/${unitId}/change-requests`, {
				specType,
				requestedValue,
				currentValue: currentValue || null,
				comment: comment || null,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: key });
			qc.invalidateQueries({ queryKey: ["change-requests"] });
			setOpen(false);
			setRequestedValue("");
			setCurrentValue("");
			setComment("");
			setSpecType("area");
			toast({ title: "Заявка на изменение отправлена в ПТО" });
		},
		onError: (e) => toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" }),
	});

	return (
		<div className="rounded-lg border border-gray-200 p-3">
			<div className="mb-2 flex items-center justify-between">
				<p className="text-sm font-semibold text-slate-800">Заявки на изменение</p>
				{!open && (
					<Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
						+ Заявка
					</Button>
				)}
			</div>

			{open && (
				<div className="mb-3 space-y-2 rounded-md bg-gray-50 p-3">
					<div className="grid gap-2 sm:grid-cols-2">
						<div>
							<Label className="text-xs">Что меняем</Label>
							<Select value={specType} onValueChange={setSpecType}>
								<SelectTrigger className="mt-1 h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SPEC_TYPES.map((s) => (
										<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Текущее (необязательно)</Label>
							<Input className="mt-1 h-9" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="напр. 42.5 м²" />
						</div>
					</div>
					<div>
						<Label className="text-xs">Желаемое значение *</Label>
						<Input className="mt-1 h-9" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} placeholder="напр. 45 м² / +1 мокрая точка" />
					</div>
					<div>
						<Label className="text-xs">Комментарий</Label>
						<Input className="mt-1 h-9" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Причина изменения" />
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
						<Button
							type="button"
							size="sm"
							className="bg-am-brand hover:bg-am-brand-hover"
							disabled={!requestedValue.trim() || create.isPending}
							onClick={() => create.mutate()}
						>
							Отправить
						</Button>
					</div>
				</div>
			)}

			{requests.length === 0 ? (
				<p className="text-xs text-gray-400">Заявок пока нет</p>
			) : (
				<ul className="space-y-2">
					{requests.map((r) => {
						const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
						return (
							<li key={r.id} className="rounded-md border border-gray-100 p-2 text-xs">
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium text-slate-800">
										{SPEC_LABEL[r.specType] ?? r.specType}: {r.currentValue ? `${r.currentValue} → ` : ""}{r.requestedValue}
									</span>
									<span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-medium ${badge.cls}`}>{badge.label}</span>
								</div>
								{r.comment && <p className="mt-1 text-gray-500">{r.comment}</p>}
								<p className="mt-1 text-[11px] text-gray-400">
									{r.requestedByName || "—"} · {fmt(r.createdAt)}
									{r.reviewedAt && ` · ПТО: ${r.reviewedByName || "—"}, ${fmt(r.reviewedAt)}`}
								</p>
								{r.reviewComment && <p className="text-[11px] text-gray-500">ПТО: {r.reviewComment}</p>}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
