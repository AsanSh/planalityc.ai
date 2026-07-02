import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { requestStatusBadge, requestStatusLabel } from "@/lib/supply-status";
import { ForemanShell } from "./foreman-shell";

interface SupplyRequest {
	id: number;
	status: string;
	priority: string;
	requestedBy: number;
	neededByDate?: string | null;
	createdAt: string;
}

/** Экран «Мои заявки»: заявки прораба со статусами + подтверждение приёмки (S2/S6). */
export default function ForemanMyRequests() {
	const { user } = useAuth();
	const { toast } = useToast();
	const qc = useQueryClient();
	const userId = (user as { id?: number } | null)?.id;

	const { data: requests = [], isLoading } = useQuery<SupplyRequest[]>({
		queryKey: ["foreman-my-requests"],
		queryFn: () => api.get("/supply/requests").then((r) => r.data),
	});

	const receiveMut = useMutation({
		mutationFn: (id: number) => api.post(`/supply/requests/${id}/receive`),
		onSuccess: () => {
			toast({ title: "Приёмка подтверждена" });
			qc.invalidateQueries({ queryKey: ["foreman-my-requests"] });
		},
		onError: (e) =>
			toast({
				title: "Не удалось подтвердить",
				description: e instanceof Error ? e.message : undefined,
				variant: "destructive",
			}),
	});

	const mine = userId
		? requests.filter((r) => r.requestedBy === userId)
		: requests;

	return (
		<ForemanShell title="Мои заявки">
			{isLoading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
			{!isLoading && mine.length === 0 && (
				<div className="text-center text-sm text-muted-foreground">
					<p>Заявок пока нет.</p>
					<Link
						href="/foreman/new"
						className="mt-2 inline-block font-medium text-primary"
					>
						Создать заявку
					</Link>
				</div>
			)}

			<ul className="space-y-2">
				{mine.map((r) => (
					<li key={r.id} className="rounded-lg border bg-card p-3">
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium">Заявка №{r.id}</span>
							<Badge className={requestStatusBadge(r.status)}>
								{requestStatusLabel(r.status)}
							</Badge>
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{new Date(r.createdAt).toLocaleDateString("ru-KG")}
							{r.neededByDate ? ` · нужно к ${r.neededByDate}` : ""}
						</div>
						{r.status === "ordered" && (
							<Button
								className="mt-3 w-full"
								size="sm"
								onClick={() => receiveMut.mutate(r.id)}
								disabled={receiveMut.isPending}
							>
								Подтвердить приёмку
							</Button>
						)}
					</li>
				))}
			</ul>
		</ForemanShell>
	);
}
