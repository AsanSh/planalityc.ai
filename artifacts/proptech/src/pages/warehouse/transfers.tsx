import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
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
	type: string;
}

interface StockRow {
	itemId: number;
	itemName: string;
	unit: string;
	available: string;
}

interface Transfer {
	id: number;
	fromWarehouseId: number;
	toWarehouseId: number;
	status:
		| "draft"
		| "in_transit"
		| "received"
		| "received_with_discrepancy"
		| "cancelled";
	documentNumber: string | null;
	createdAt: string;
}

const STATUS_LABEL: Record<Transfer["status"], string> = {
	draft: "Черновик",
	in_transit: "В пути",
	received: "Принято",
	received_with_discrepancy: "Принято с расхождением",
	cancelled: "Отменено",
};

const STATUS_COLOR: Record<Transfer["status"], string> = {
	draft: "bg-slate-100 text-slate-700",
	in_transit: "bg-blue-100 text-blue-800",
	received: "bg-emerald-100 text-emerald-800",
	received_with_discrepancy: "bg-amber-100 text-amber-800",
	cancelled: "bg-rose-100 text-rose-700",
};

interface Line {
	itemId: number;
	itemName: string;
	unit: string;
	available: number;
	quantitySent: string;
}

export default function TransfersPage() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [fromId, setFromId] = useState<string>("");
	const [toId, setToId] = useState<string>("");
	const [lines, setLines] = useState<Line[]>([]);

	const { data: warehouses = [] } = useQuery<Warehouse[]>({
		queryKey: ["warehouses"],
		queryFn: () => api.get("/warehouse/warehouses").then((r) => r.data),
	});

	const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
		queryKey: ["warehouse-transfers"],
		queryFn: () => api.get("/warehouse/transfers").then((r) => r.data),
	});

	const { data: sourceStock = [] } = useQuery<StockRow[]>({
		queryKey: ["warehouse-stock", fromId],
		queryFn: () =>
			api
				.get(`/warehouse/stock?warehouseId=${fromId}`)
				.then((r) => r.data),
		enabled: !!fromId,
	});

	const warehouseName = (id: number) =>
		warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

	const addLine = (itemId: number) => {
		const s = sourceStock.find((x) => x.itemId === itemId);
		if (!s || lines.some((l) => l.itemId === itemId)) return;
		setLines((prev) => [
			...prev,
			{
				itemId: s.itemId,
				itemName: s.itemName,
				unit: s.unit,
				available: Number(s.available),
				quantitySent: "",
			},
		]);
	};

	const createMutation = useMutation({
		mutationFn: () =>
			api.post("/warehouse/transfers", {
				fromWarehouseId: Number(fromId),
				toWarehouseId: Number(toId),
				items: lines.map((l) => ({
					itemId: l.itemId,
					quantitySent: l.quantitySent || "0",
				})),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
			setDialogOpen(false);
			setFromId("");
			setToId("");
			setLines([]);
			toast({ title: "Перемещение создано (черновик)" });
		},
		onError: (e: any) =>
			toast({
				title: "Не удалось создать перемещение",
				description: e?.response?.data?.error,
				variant: "destructive",
			}),
	});

	const canCreate =
		fromId &&
		toId &&
		fromId !== toId &&
		lines.length > 0 &&
		lines.every(
			(l) =>
				Number(l.quantitySent) > 0 && Number(l.quantitySent) <= l.available,
		);

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<ArrowRightLeft className="h-6 w-6 text-teal-700" />
					<h1 className="text-2xl font-semibold">Перемещения</h1>
				</div>
				<Button onClick={() => setDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Создать перемещение
				</Button>
			</div>

			{isLoading ? (
				<p className="text-muted-foreground">Загрузка…</p>
			) : transfers.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
					Перемещений пока нет.
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left">
							<tr>
								<th className="px-4 py-3 font-medium">№</th>
								<th className="px-4 py-3 font-medium">Откуда</th>
								<th className="px-4 py-3 font-medium">Куда</th>
								<th className="px-4 py-3 font-medium">Статус</th>
								<th className="px-4 py-3 font-medium">Действие</th>
							</tr>
						</thead>
						<tbody>
							{transfers.map((t) => (
								<tr key={t.id} className="border-t">
									<td className="px-4 py-3">{t.documentNumber || t.id}</td>
									<td className="px-4 py-3">{warehouseName(t.fromWarehouseId)}</td>
									<td className="px-4 py-3">{warehouseName(t.toWarehouseId)}</td>
									<td className="px-4 py-3">
										<Badge
											className={STATUS_COLOR[t.status]}
											variant="secondary"
										>
											{STATUS_LABEL[t.status]}
										</Badge>
									</td>
									<td className="px-4 py-3">
										{(t.status === "draft" || t.status === "in_transit") && (
											<Link href={`/warehouse/transfers/${t.id}/receive`}>
												<Button size="sm" variant="outline">
													Открыть
												</Button>
											</Link>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Новое перемещение</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Откуда</Label>
								<Select
									value={fromId}
									onValueChange={(v) => {
										setFromId(v);
										setLines([]);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Склад-источник" />
									</SelectTrigger>
									<SelectContent>
										{warehouses.map((w) => (
											<SelectItem key={w.id} value={String(w.id)}>
												{w.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Куда</Label>
								<Select value={toId} onValueChange={setToId}>
									<SelectTrigger>
										<SelectValue placeholder="Склад-получатель" />
									</SelectTrigger>
									<SelectContent>
										{warehouses
											.filter((w) => String(w.id) !== fromId)
											.map((w) => (
												<SelectItem key={w.id} value={String(w.id)}>
													{w.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{fromId && (
							<div className="space-y-2">
								<Label>Добавить позицию со склада-источника</Label>
								<Select value="" onValueChange={(v) => addLine(Number(v))}>
									<SelectTrigger>
										<SelectValue placeholder="Выберите материал" />
									</SelectTrigger>
									<SelectContent>
										{sourceStock
											.filter(
												(s) =>
													Number(s.available) > 0 &&
													!lines.some((l) => l.itemId === s.itemId),
											)
											.map((s) => (
												<SelectItem key={s.itemId} value={String(s.itemId)}>
													{s.itemName} (доступно {s.available} {s.unit})
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						)}

						{lines.length > 0 && (
							<div className="space-y-2">
								{lines.map((l) => (
									<div
										key={l.itemId}
										className="flex items-center gap-2 rounded border p-2"
									>
										<div className="flex-1">
											<div className="font-medium">{l.itemName}</div>
											<div className="text-xs text-muted-foreground">
												Доступно {l.available} {l.unit}
											</div>
										</div>
										<Input
											type="number"
											className="w-24"
											value={l.quantitySent}
											onChange={(e) =>
												setLines((prev) =>
													prev.map((x) =>
														x.itemId === l.itemId
															? { ...x, quantitySent: e.target.value }
															: x,
													),
												)
											}
											placeholder="Кол-во"
										/>
										<Button
											size="icon"
											variant="ghost"
											onClick={() =>
												setLines((prev) =>
													prev.filter((x) => x.itemId !== l.itemId),
												)
											}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="mt-4 flex justify-end gap-2">
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Отмена
						</Button>
						<Button
							disabled={!canCreate || createMutation.isPending}
							onClick={() => createMutation.mutate()}
						>
							Создать черновик
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
