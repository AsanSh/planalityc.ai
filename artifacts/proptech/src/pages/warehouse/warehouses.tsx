import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { api } from "@/lib/api";

interface Warehouse {
	id: number;
	name: string;
	type: "central" | "project" | "foreman" | "transit";
	projectId: number | null;
	address: string | null;
	isActive: boolean;
}

interface Project {
	id: number;
	name: string;
}

const TYPE_LABEL: Record<Warehouse["type"], string> = {
	central: "Центральный",
	project: "Объектный",
	foreman: "Прорабский",
	transit: "Транзитный",
};

const TYPE_COLOR: Record<Warehouse["type"], string> = {
	central: "bg-teal-100 text-teal-800",
	project: "bg-blue-100 text-blue-800",
	foreman: "bg-amber-100 text-amber-800",
	transit: "bg-slate-100 text-slate-700",
};

export default function WarehousesPage() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [name, setName] = useState("");
	const [type, setType] = useState<Warehouse["type"]>("central");
	const [projectId, setProjectId] = useState<string>("");
	const [address, setAddress] = useState("");

	const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
		queryKey: ["warehouses"],
		queryFn: () => api.get("/warehouse/warehouses").then((r) => r.data),
	});

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects-for-warehouses"],
		queryFn: async () => {
			const { data } = await api.get<any>("/construction/projects");
			return Array.isArray(data) ? data : data?.items ?? [];
		},
	});

	const createMutation = useMutation({
		mutationFn: () =>
			api.post("/warehouse/warehouses", {
				name,
				type,
				projectId: projectId ? Number(projectId) : null,
				address: address || null,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["warehouses"] });
			setDialogOpen(false);
			setName("");
			setType("central");
			setProjectId("");
			setAddress("");
			toast({ title: "Склад создан" });
		},
		onError: () =>
			toast({ title: "Не удалось создать склад", variant: "destructive" }),
	});

	const projectName = (id: number | null) =>
		id ? (projects.find((p) => p.id === id)?.name ?? `#${id}`) : "—";

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<WarehouseIcon className="h-6 w-6 text-teal-700" />
					<h1 className="text-2xl font-semibold">Склады</h1>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Добавить склад
				</Button>
			</div>

			{isLoading ? (
				<p className="text-muted-foreground">Загрузка…</p>
			) : warehouses.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
					Складов пока нет. Создайте первый — обычно это «Центральный склад».
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left">
							<tr>
								<th className="px-4 py-3 font-medium">Название</th>
								<th className="px-4 py-3 font-medium">Тип</th>
								<th className="px-4 py-3 font-medium">Объект</th>
								<th className="px-4 py-3 font-medium">Адрес</th>
								<th className="px-4 py-3 font-medium">Статус</th>
							</tr>
						</thead>
						<tbody>
							{warehouses.map((w) => (
								<tr key={w.id} className="border-t">
									<td className="px-4 py-3 font-medium">{w.name}</td>
									<td className="px-4 py-3">
										<Badge className={TYPE_COLOR[w.type]} variant="secondary">
											{TYPE_LABEL[w.type]}
										</Badge>
									</td>
									<td className="px-4 py-3">{projectName(w.projectId)}</td>
									<td className="px-4 py-3 text-muted-foreground">
										{w.address || "—"}
									</td>
									<td className="px-4 py-3">
										{w.isActive ? (
											<span className="text-emerald-600">Активен</span>
										) : (
											<span className="text-muted-foreground">Неактивен</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Новый склад</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Название</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Например, Центральный склад"
							/>
						</div>
						<div className="space-y-2">
							<Label>Тип</Label>
							<Select
								value={type}
								onValueChange={(v) => setType(v as Warehouse["type"])}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="central">Центральный</SelectItem>
									<SelectItem value="project">Объектный</SelectItem>
									<SelectItem value="foreman">Прорабский</SelectItem>
									<SelectItem value="transit">Транзитный</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{(type === "project" || type === "foreman") && (
							<div className="space-y-2">
								<Label>Объект (проект)</Label>
								<Select value={projectId} onValueChange={setProjectId}>
									<SelectTrigger>
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
							</div>
						)}
						<div className="space-y-2">
							<Label>Адрес (необязательно)</Label>
							<Input
								value={address}
								onChange={(e) => setAddress(e.target.value)}
							/>
						</div>
					</div>
					<div className="mt-4 flex justify-end gap-2">
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Отмена
						</Button>
						<Button
							disabled={!name || createMutation.isPending}
							onClick={() => createMutation.mutate()}
						>
							Создать
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
