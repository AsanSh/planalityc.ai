import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
import { api } from "@/lib/api";
import { ForemanShell } from "./foreman-shell";

interface Project {
	id: number;
	name: string;
}

interface Stage {
	id: number;
	name: string;
}

interface RequestItem {
	customName: string;
	quantity: string;
	unit: string;
}

const emptyItem = (): RequestItem => ({ customName: "", quantity: "1", unit: "шт" });

/** Экран «Новая заявка»: прораб создаёт заявку по объекту+этапу и отправляет ПТО (S2). */
export default function ForemanNewRequest() {
	const { toast } = useToast();
	const [, navigate] = useLocation();

	const { data: projects = [] } = useQuery<Project[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const [projectId, setProjectId] = useState("");
	useEffect(() => {
		if (!projectId && projects.length) setProjectId(String(projects[0].id));
	}, [projects, projectId]);

	const { data: stages = [] } = useQuery<Stage[]>({
		queryKey: ["construction-stages", projectId],
		queryFn: () =>
			api.get(`/construction/stages?projectId=${projectId}`).then((r) => r.data),
		enabled: !!projectId,
	});
	const [stageId, setStageId] = useState("");
	const [items, setItems] = useState<RequestItem[]>([emptyItem()]);
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	const setItem = (i: number, patch: Partial<RequestItem>) =>
		setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

	const submit = async () => {
		const validItems = items.filter((it) => it.customName.trim());
		if (!projectId) {
			toast({ title: "Выберите объект" });
			return;
		}
		if (validItems.length === 0) {
			toast({ title: "Добавьте хотя бы одну позицию" });
			return;
		}
		setSaving(true);
		try {
			const { data: created } = await api.post<{ id: number }>("/supply/requests", {
				projectId: Number(projectId),
				constructionStageId: stageId ? Number(stageId) : undefined,
				notes: notes || undefined,
				items: validItems.map((it) => ({
					customName: it.customName.trim(),
					quantity: it.quantity || "0",
					unit: it.unit || "шт",
				})),
			});
			await api.post(`/supply/requests/${created.id}/submit`);
			toast({ title: "Заявка отправлена ПТО" });
			navigate("/foreman");
		} catch (e) {
			toast({
				title: "Не удалось отправить",
				description: e instanceof Error ? e.message : undefined,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<ForemanShell title="Новая заявка">
			<div className="space-y-4">
				<div>
					<Label className="mb-1 block text-sm">Объект</Label>
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

				<div>
					<Label className="mb-1 block text-sm">Этап (необязательно)</Label>
					<Select value={stageId} onValueChange={setStageId}>
						<SelectTrigger>
							<SelectValue placeholder="Выберите этап" />
						</SelectTrigger>
						<SelectContent>
							{stages.map((s) => (
								<SelectItem key={s.id} value={String(s.id)}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div>
					<div className="mb-2 flex items-center justify-between">
						<Label className="text-sm">Позиции</Label>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setItems((p) => [...p, emptyItem()])}
						>
							<Plus className="mr-1 h-4 w-4" /> Добавить
						</Button>
					</div>
					<div className="space-y-2">
						{items.map((it, i) => (
							<div key={i} className="flex items-center gap-2">
								<Input
									className="flex-1"
									placeholder="Материал"
									value={it.customName}
									onChange={(e) => setItem(i, { customName: e.target.value })}
								/>
								<Input
									className="w-16"
									type="number"
									inputMode="decimal"
									value={it.quantity}
									onChange={(e) => setItem(i, { quantity: e.target.value })}
								/>
								<Input
									className="w-14"
									value={it.unit}
									onChange={(e) => setItem(i, { unit: e.target.value })}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
									disabled={items.length === 1}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				</div>

				<div>
					<Label className="mb-1 block text-sm">Комментарий</Label>
					<Input
						placeholder="Например: срочно, к пятнице"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>

				<Button className="w-full" onClick={submit} disabled={saving}>
					{saving ? "Отправка…" : "Отправить ПТО"}
				</Button>
			</div>
		</ForemanShell>
	);
}
