import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";

type SupplyOrder = {
	id: number;
	supplierId: number;
	status: string;
	paymentType: string;
	paymentStatus: string;
	totalAmount: string;
	paidAmount: string;
	currency: string;
};
type Supplier = { id: number; name: string };

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
	none: { label: "Не отправлен", color: "bg-gray-100 text-gray-700" },
	pending_finance: { label: "На согласовании", color: "bg-amber-100 text-amber-800" },
	approved_by_finance: { label: "Согласован", color: "bg-blue-100 text-blue-800" },
	sent_to_payment: { label: "Передан на оплату", color: "bg-indigo-100 text-indigo-800" },
	paid_partially: { label: "Оплачен частично", color: "bg-teal-100 text-teal-800" },
	paid: { label: "Оплачен", color: "bg-emerald-100 text-emerald-800" },
	payment_rejected: { label: "Отклонён", color: "bg-rose-100 text-rose-700" },
};

export default function WarehouseFinanceQueue() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [payInput, setPayInput] = useState<Record<number, string>>({});

	const { data: orders = [] } = useQuery<SupplyOrder[]>({
		queryKey: ["supply-orders"],
		queryFn: () => api.get("/supply/orders").then((r) => r.data),
	});
	const { data: suppliers = [] } = useQuery<Supplier[]>({
		queryKey: ["warehouse-suppliers-light"],
		queryFn: () =>
			api.get<any[]>("/warehouse/suppliers").then((r) =>
				(Array.isArray(r.data) ? r.data : []).map((s) => ({ id: Number(s.id), name: String(s.name) })),
			),
	});

	const supplierName = (id: number) => suppliers.find((s) => s.id === id)?.name ?? `#${id}`;

	const act = useMutation({
		mutationFn: ({ id, action, body }: { id: number; action: string; body?: any }) =>
			api.post(`/supply/orders/${id}/${action}`, body ?? {}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["supply-orders"] });
			toast({ title: "Статус обновлён" });
		},
		onError: (e) =>
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" }),
	});

	const money = (v: string, cur: string) =>
		`${Number(v).toLocaleString("ru-KG")} ${cur}`;

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center gap-2">
				<Wallet className="h-6 w-6 text-teal-700" />
				<h1 className="text-2xl font-semibold">Финсогласование и оплата</h1>
			</div>
			<div className="overflow-hidden rounded-lg border">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left">
						<tr>
							<th className="px-4 py-3 font-medium">Заказ</th>
							<th className="px-4 py-3 font-medium">Поставщик</th>
							<th className="px-4 py-3 font-medium">Сумма</th>
							<th className="px-4 py-3 font-medium">Оплачено</th>
							<th className="px-4 py-3 font-medium">Статус оплаты</th>
							<th className="px-4 py-3 font-medium">Действия</th>
						</tr>
					</thead>
					<tbody>
						{orders.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
									Заказов нет.
								</td>
							</tr>
						) : (
							orders.map((o) => {
								const ps = PAYMENT_STATUS[o.paymentStatus] ?? PAYMENT_STATUS.none;
								return (
									<tr key={o.id} className="border-t align-middle">
										<td className="px-4 py-3">#{o.id}</td>
										<td className="px-4 py-3">{supplierName(o.supplierId)}</td>
										<td className="px-4 py-3">{money(o.totalAmount, o.currency)}</td>
										<td className="px-4 py-3">{money(o.paidAmount, o.currency)}</td>
										<td className="px-4 py-3">
											<Badge className={ps.color} variant="secondary">
												{ps.label}
											</Badge>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap items-center gap-2">
												{(o.paymentStatus === "none" ||
													o.paymentStatus === "payment_rejected") && (
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															act.mutate({ id: o.id, action: "submit-to-finance" })
														}
													>
														На согласование
													</Button>
												)}
												{o.paymentStatus === "pending_finance" && (
													<>
														<Button
															size="sm"
															onClick={() =>
																act.mutate({ id: o.id, action: "finance-approve" })
															}
														>
															Согласовать
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																act.mutate({ id: o.id, action: "reject-payment" })
															}
														>
															Отклонить
														</Button>
													</>
												)}
												{o.paymentStatus === "approved_by_finance" && (
													<Button
														size="sm"
														onClick={() =>
															act.mutate({ id: o.id, action: "send-to-payment" })
														}
													>
														Передать на оплату
													</Button>
												)}
												{(o.paymentStatus === "sent_to_payment" ||
													o.paymentStatus === "paid_partially") && (
													<div className="flex items-center gap-2">
														<Input
															type="number"
															className="h-8 w-28"
															placeholder="Сумма"
															value={payInput[o.id] ?? ""}
															onChange={(e) =>
																setPayInput((p) => ({ ...p, [o.id]: e.target.value }))
															}
														/>
														<Button
															size="sm"
															disabled={!(Number(payInput[o.id]) > 0)}
															onClick={() =>
																act.mutate({
																	id: o.id,
																	action: "register-payment",
																	body: { amount: Number(payInput[o.id]) },
																})
															}
														>
															Провести оплату
														</Button>
													</div>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
