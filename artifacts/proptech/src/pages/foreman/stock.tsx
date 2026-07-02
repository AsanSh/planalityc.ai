import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { ForemanShell } from "./foreman-shell";

interface Project {
	id: number;
	name: string;
}

interface StockLine {
	itemId: number;
	itemName: string | null;
	unit: string | null;
	quantity: number;
	reserved: number;
	available: number;
}

/** Экран «Мои остатки»: остатки материалов на выбранном объекте (S1 endpoint). */
export default function ForemanStock() {
	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});

	const [projectId, setProjectId] = useState("");
	useEffect(() => {
		if (!projectId && projects.length) setProjectId(String(projects[0].id));
	}, [projects, projectId]);

	const {
		data: stock = [],
		isLoading,
		isError,
	} = useQuery<StockLine[]>({
		queryKey: ["foreman-object-stock", projectId],
		queryFn: () =>
			api.get(`/warehouse/objects/${projectId}/stock`).then((r) => r.data),
		enabled: !!projectId,
	});

	return (
		<ForemanShell title="Мои остатки">
			<Select value={projectId} onValueChange={setProjectId}>
				<SelectTrigger className="mb-4">
					<SelectValue placeholder="Выберите объект" />
				</SelectTrigger>
				<SelectContent>
					{projects.map((p) => (
						<SelectItem key={p.id} value={String(p.id)}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{isLoading && (
				<p className="text-sm text-muted-foreground">Загрузка…</p>
			)}
			{isError && (
				<p className="text-sm text-destructive">
					Не удалось загрузить остатки
				</p>
			)}
			{!isLoading && !isError && stock.length === 0 && projectId && (
				<p className="text-sm text-muted-foreground">
					На этом объекте пока нет остатков.
				</p>
			)}

			<ul className="space-y-2">
				{stock.map((s) => (
					<li key={s.itemId} className="rounded-lg border bg-card p-3">
						<div className="flex items-center justify-between">
							<span className="font-medium">
								{s.itemName ?? `Позиция #${s.itemId}`}
							</span>
							<span className="text-lg font-semibold">
								{s.available}{" "}
								<span className="text-xs text-muted-foreground">
									{s.unit ?? ""}
								</span>
							</span>
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							Всего {s.quantity} · в резерве {s.reserved}
						</div>
					</li>
				))}
			</ul>
		</ForemanShell>
	);
}
