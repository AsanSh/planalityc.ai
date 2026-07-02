import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { SPEC_TYPES, downloadDocMeta } from "@/components/construction/unit-change-requests";

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
	unitNumber?: string | null;
	block?: string | null;
	floor?: number | null;
	projectName?: string | null;
	documentMeta?: string | null;
}

const fmt = (d?: string | null) =>
	d ? new Date(d).toLocaleString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export default function ConstructionChangeRequests() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [statusFilter, setStatusFilter] = useState("pending");

	const key = ["change-requests", statusFilter];
	const { data: requests = [], isLoading } = useQuery<ChangeRequest[]>({
		queryKey: key,
		queryFn: () =>
			api.get(`/construction/change-requests${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`).then((r) => r.data),
	});

	const review = useMutation({
		mutationFn: ({ id, action }: { id: number; action: "accept" | "reject" }) =>
			api.post(`/construction/change-requests/${id}/review`, { action }),
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["change-requests"] });
			toast({ title: v.action === "accept" ? "Заявка принята в работу" : "Заявка отклонена" });
		},
		onError: (e) => toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" }),
	});

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<ClipboardList className="h-6 w-6 text-cyan-700" />
					<h1 className="text-2xl font-semibold">Заявки на изменение</h1>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-52">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="pending">На рассмотрении</SelectItem>
						<SelectItem value="in_progress">Принятые в работу</SelectItem>
						<SelectItem value="rejected">Отклонённые</SelectItem>
						<SelectItem value="all">Все</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<p className="text-muted-foreground">Загрузка…</p>
			) : requests.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
					Заявок нет.
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left">
							<tr>
								<th className="px-4 py-3 font-medium">Помещение</th>
								<th className="px-4 py-3 font-medium">Изменение</th>
								<th className="px-4 py-3 font-medium">Инициатор</th>
								<th className="px-4 py-3 font-medium">Статус</th>
								<th className="px-4 py-3 font-medium">Действия</th>
							</tr>
						</thead>
						<tbody>
							{requests.map((r) => {
								const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
								return (
									<tr key={r.id} className="border-t align-top">
										<td className="px-4 py-3">
											<div className="font-medium">{r.unitNumber || `#${r.id}`}{r.block ? ` · ${r.block}` : ""}</div>
											<div className="text-xs text-muted-foreground">{r.projectName || ""}{r.floor != null ? ` · этаж ${r.floor}` : ""}</div>
										</td>
										<td className="px-4 py-3">
											<div>{SPEC_LABEL[r.specType] ?? r.specType}: {r.currentValue ? `${r.currentValue} → ` : ""}<span className="font-semibold">{r.requestedValue}</span></div>
											{r.comment && <div className="text-xs text-muted-foreground">{r.comment}</div>}
											{r.documentMeta && (
												<button type="button" onClick={() => downloadDocMeta(r.documentMeta)} className="mt-0.5 text-xs font-medium text-cyan-700 underline">
													Скачать файл
												</button>
											)}
										</td>
										<td className="px-4 py-3">
											<div>{r.requestedByName || "—"}</div>
											<div className="text-xs text-muted-foreground">{fmt(r.createdAt)}</div>
											{r.reviewedAt && (
												<div className="text-xs text-muted-foreground">ПТО: {r.reviewedByName || "—"}, {fmt(r.reviewedAt)}</div>
											)}
										</td>
										<td className="px-4 py-3">
											<span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
										</td>
										<td className="px-4 py-3">
											{r.status === "pending" ? (
												<div className="flex gap-2">
													<Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, action: "accept" })}>
														Принять
													</Button>
													<Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, action: "reject" })}>
														Отклонить
													</Button>
												</div>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
