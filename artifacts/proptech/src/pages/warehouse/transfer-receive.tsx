import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PackageCheck, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface TransferItem {
	id: number;
	itemId: number;
	quantitySent: string;
	quantityReceived: string | null;
}

interface TransferDetail {
	id: number;
	fromWarehouseId: number;
	toWarehouseId: number;
	status: string;
	documentNumber: string | null;
	items: TransferItem[];
}

interface StockRow {
	itemId: number;
	itemName: string;
	unit: string;
}

/**
 * Мобильный экран приёмки перемещения для прораба.
 * Черновик → отправить; в пути → принять (полностью или с расхождением).
 */
export default function TransferReceivePage() {
	const params = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const id = Number(params.id);
	const [received, setReceived] = useState<Record<number, string>>({});

	const { data: transfer, isLoading } = useQuery<TransferDetail>({
		queryKey: ["warehouse-transfer", id],
		queryFn: () => api.get(`/warehouse/transfers/${id}`).then((r) => r.data),
	});

	// имена материалов — со склада-источника
	const { data: stock = [] } = useQuery<StockRow[]>({
		queryKey: ["warehouse-stock", transfer?.fromWarehouseId],
		queryFn: () =>
			api
				.get(`/warehouse/stock?warehouseId=${transfer!.fromWarehouseId}`)
				.then((r) => r.data),
		enabled: !!transfer?.fromWarehouseId,
	});

	// по умолчанию принято = отправлено
	useEffect(() => {
		if (transfer && Object.keys(received).length === 0) {
			const initial: Record<number, string> = {};
			for (const it of transfer.items) initial[it.itemId] = it.quantitySent;
			setReceived(initial);
		}
	}, [transfer]); // eslint-disable-line react-hooks/exhaustive-deps

	const itemName = (itemId: number) =>
		stock.find((s) => s.itemId === itemId)?.itemName ?? `Позиция #${itemId}`;
	const itemUnit = (itemId: number) =>
		stock.find((s) => s.itemId === itemId)?.unit ?? "";

	const sendMutation = useMutation({
		mutationFn: () => api.post(`/warehouse/transfers/${id}/send`, {}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["warehouse-transfer", id] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
			toast({ title: "Отправлено, статус «В пути»" });
		},
		onError: (e: any) =>
			toast({
				title: "Не удалось отправить",
				description: e?.response?.data?.error,
				variant: "destructive",
			}),
	});

	const receiveMutation = useMutation({
		mutationFn: () =>
			api.post(`/warehouse/transfers/${id}/receive`, {
				items: transfer!.items.map((it) => ({
					itemId: it.itemId,
					quantityReceived: received[it.itemId] ?? it.quantitySent,
				})),
			}),
		onSuccess: (r: any) => {
			queryClient.invalidateQueries({ queryKey: ["warehouse-transfer", id] });
			queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
			const discr = r?.data?.discrepancies ?? [];
			toast({
				title: discr.length
					? "Принято с расхождением"
					: "Принято полностью",
			});
			navigate("/warehouse/transfers");
		},
		onError: (e: any) =>
			toast({
				title: "Не удалось принять",
				description: e?.response?.data?.error,
				variant: "destructive",
			}),
	});

	if (isLoading || !transfer) {
		return <p className="p-6 text-muted-foreground">Загрузка…</p>;
	}

	const hasDiscrepancy = transfer.items.some(
		(it) => Number(received[it.itemId] ?? it.quantitySent) !== Number(it.quantitySent),
	);

	return (
		<div className="mx-auto max-w-md space-y-5 p-4">
			<button
				onClick={() => navigate("/warehouse/transfers")}
				className="flex items-center gap-1 text-sm text-muted-foreground"
			>
				<ArrowLeft className="h-4 w-4" /> К перемещениям
			</button>

			<div>
				<h1 className="text-xl font-semibold">
					Перемещение №{transfer.documentNumber || transfer.id}
				</h1>
				<Badge variant="secondary" className="mt-1">
					{transfer.status}
				</Badge>
			</div>

			<div className="space-y-3">
				{transfer.items.map((it) => (
					<div key={it.id} className="rounded-lg border p-4">
						<div className="text-base font-medium">{itemName(it.itemId)}</div>
						<div className="mt-1 text-sm text-muted-foreground">
							Отправлено: {it.quantitySent} {itemUnit(it.itemId)}
						</div>
						{transfer.status === "in_transit" && (
							<div className="mt-3">
								<label className="text-sm">Фактически получено</label>
								<Input
									type="number"
									inputMode="decimal"
									className="mt-1 h-12 text-lg"
									value={received[it.itemId] ?? ""}
									onChange={(e) =>
										setReceived((prev) => ({
											...prev,
											[it.itemId]: e.target.value,
										}))
									}
								/>
							</div>
						)}
						{it.quantityReceived != null && (
							<div className="mt-2 text-sm text-emerald-700">
								Принято: {it.quantityReceived} {itemUnit(it.itemId)}
							</div>
						)}
					</div>
				))}
			</div>

			{transfer.status === "draft" && (
				<Button
					className="h-12 w-full text-base"
					disabled={sendMutation.isPending}
					onClick={() => sendMutation.mutate()}
				>
					<Send className="mr-2 h-5 w-5" /> Отправить со склада
				</Button>
			)}

			{transfer.status === "in_transit" && (
				<Button
					className="h-12 w-full text-base"
					variant={hasDiscrepancy ? "outline" : "default"}
					disabled={receiveMutation.isPending}
					onClick={() => receiveMutation.mutate()}
				>
					<PackageCheck className="mr-2 h-5 w-5" />
					{hasDiscrepancy ? "Принять с расхождением" : "Принять полностью"}
				</Button>
			)}
		</div>
	);
}
