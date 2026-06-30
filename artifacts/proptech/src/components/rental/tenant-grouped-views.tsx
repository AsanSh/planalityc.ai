import { ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	AccrualActionButtons,
	AccrualRow,
	AccrualsTableHeader,
	fmtCurrency,
	formatDate,
	type Accrual,
} from "@/components/rental/accrual-components";
import { cn } from "@/lib/utils";

export type EnrichedAccrual = Accrual & {
	projectName: string;
	contractLabel: string;
	tenantName: string;
	tenantKey: string;
};

export type EnrichedPayment = {
	id: number;
	leaseContractId: number;
	amount: string | number;
	paymentDate: string;
	paymentMethod?: string | null;
	note?: string | null;
	projectName: string;
	contractLabel: string;
	tenantName: string;
	tenantKey: string;
};

export type TenantAccrualGroup = {
	key: string;
	name: string;
	accruals: EnrichedAccrual[];
	totalAmount: number;
	totalPaid: number;
	totalBalance: number;
};

export type TenantPaymentGroup = {
	key: string;
	name: string;
	payments: EnrichedPayment[];
	totalPaid: number;
};

export function buildTenantAccrualGroups(
	accruals: EnrichedAccrual[],
): TenantAccrualGroup[] {
	const map = new Map<string, TenantAccrualGroup>();
	for (const a of accruals) {
		const key = a.tenantKey || a.tenantName || "unknown";
		const name = a.tenantName || "Без арендатора";
		if (!map.has(key)) {
			map.set(key, {
				key,
				name,
				accruals: [],
				totalAmount: 0,
				totalPaid: 0,
				totalBalance: 0,
			});
		}
		const g = map.get(key)!;
		g.accruals.push(a);
		g.totalAmount += parseFloat(a.amount || "0");
		g.totalPaid += parseFloat(a.paidAmount || "0");
		g.totalBalance += parseFloat(a.balance || "0");
	}
	for (const g of map.values()) {
		g.accruals.sort(
			(a, b) =>
				b.dueDate.localeCompare(a.dueDate) || b.period.localeCompare(a.period),
		);
	}
	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function buildTenantPaymentGroups(
	payments: EnrichedPayment[],
): TenantPaymentGroup[] {
	const map = new Map<string, TenantPaymentGroup>();
	for (const p of payments) {
		const key = p.tenantKey || p.tenantName || "unknown";
		const name = p.tenantName || "Без арендатора";
		if (!map.has(key)) {
			map.set(key, { key, name, payments: [], totalPaid: 0 });
		}
		const g = map.get(key)!;
		g.payments.push(p);
		g.totalPaid += parseFloat(String(p.amount || "0"));
	}
	for (const g of map.values()) {
		g.payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
	}
	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

const methodLabels: Record<string, string> = {
	cash: "Наличные",
	bank_transfer: "Перевод",
	card: "Карта",
	online: "Онлайн",
	other: "Другое",
};

interface TenantAccrualsGroupedViewProps {
	accruals: EnrichedAccrual[];
	isLoading?: boolean;
	loadingId: number | null;
	onAccept: (a: Accrual) => void;
	onStatusChange: (id: number, status: string) => void;
	onDiscount: (a: Accrual) => void;
	search?: string;
}

export function TenantAccrualsGroupedView({
	accruals,
	isLoading,
	loadingId,
	onAccept,
	onStatusChange,
	onDiscount,
	search = "",
}: TenantAccrualsGroupedViewProps) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

	const groups = useMemo(() => {
		const all = buildTenantAccrualGroups(accruals);
		const q = search.trim().toLowerCase();
		if (!q) return all;
		return all.filter(
			(g) =>
				g.name.toLowerCase().includes(q) ||
				g.accruals.some(
					(a) =>
						a.contractLabel.toLowerCase().includes(q) ||
						a.projectName.toLowerCase().includes(q) ||
						a.period.toLowerCase().includes(q),
				),
		);
	}, [accruals, search]);

	const toggle = (key: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	if (isLoading) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				Загрузка...
			</div>
		);
	}

	if (groups.length === 0) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				{accruals.length
					? "Контрагенты не найдены по фильтру"
					: "Начисления не найдены"}
			</div>
		);
	}

	return (
		<div
			className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto"
			style={{ maxHeight: "calc(100vh - 320px)" }}
		>
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-gray-100">
						<th className="sticky top-0 z-10 bg-gray-50 w-10 px-2" />
						<th className="sticky top-0 z-10 bg-gray-50 text-left px-4 py-3 text-xs font-semibold text-gray-500">
							Контрагент
						</th>
						<th className="sticky top-0 z-10 bg-gray-50 text-right px-4 py-3 text-xs font-semibold text-gray-500">
							Начислено
						</th>
						<th className="sticky top-0 z-10 bg-gray-50 text-right px-4 py-3 text-xs font-semibold text-gray-500">
							Оплачено
						</th>
						<th className="sticky top-0 z-10 bg-gray-50 text-right px-4 py-3 text-xs font-semibold text-gray-500">
							Остаток
						</th>
					</tr>
				</thead>
				<tbody>
					{groups.map((tenant) => {
						const open = expanded.has(tenant.key);
						return (
							<Fragment key={tenant.key}>
								<tr
									className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
									onClick={() => toggle(tenant.key)}
								>
									<td className="px-2 py-3 text-center">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0"
											onClick={(e) => {
												e.stopPropagation();
												toggle(tenant.key);
											}}
										>
											{open ? (
												<ChevronDown className="w-4 h-4" />
											) : (
												<ChevronRight className="w-4 h-4" />
											)}
										</Button>
									</td>
									<td className="px-4 py-3 font-medium">
										{tenant.name}
										<span className="text-xs text-gray-500 ml-2">
											({tenant.accruals.length} нач.)
										</span>
									</td>
									<td className="px-4 py-3 text-right font-mono font-medium">
										{fmtCurrency(tenant.totalAmount)}
									</td>
									<td className="px-4 py-3 text-right font-mono text-emerald-600">
										{fmtCurrency(tenant.totalPaid)}
									</td>
									<td
										className={cn(
											"px-4 py-3 text-right font-mono font-bold",
											tenant.totalBalance > 0
												? "text-rose-600"
												: "text-emerald-600",
										)}
									>
										{fmtCurrency(tenant.totalBalance)}
									</td>
								</tr>
								{open && (
									<tr>
										<td colSpan={5} className="p-0 bg-gray-50/80">
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<AccrualsTableHeader label="Договор" />
													<tbody>
														{tenant.accruals.map((a) => (
															<AccrualRow
																key={a.id}
																accrual={a}
																label={a.contractLabel}
																loadingId={loadingId}
																onAccept={onAccept}
																onStatusChange={onStatusChange}
																onDiscount={onDiscount}
															/>
														))}
													</tbody>
												</table>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface TenantPaymentsGroupedViewProps {
	payments: EnrichedPayment[];
	isLoading?: boolean;
	onCancel: (payment: EnrichedPayment) => void;
	search?: string;
}

export function TenantPaymentsGroupedView({
	payments,
	isLoading,
	onCancel,
	search = "",
}: TenantPaymentsGroupedViewProps) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

	const groups = useMemo(() => {
		const all = buildTenantPaymentGroups(payments);
		const q = search.trim().toLowerCase();
		if (!q) return all;
		return all.filter(
			(g) =>
				g.name.toLowerCase().includes(q) ||
				g.payments.some(
					(p) =>
						p.contractLabel.toLowerCase().includes(q) ||
						p.projectName.toLowerCase().includes(q) ||
						(p.note || "").toLowerCase().includes(q),
				),
		);
	}, [payments, search]);

	const toggle = (key: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	if (isLoading) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				Загрузка...
			</div>
		);
	}

	if (groups.length === 0) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				{payments.length ? "Контрагенты не найдены" : "Платежи не найдены"}
			</div>
		);
	}

	return (
		<div
			className="bg-white rounded-xl border border-am-border shadow-sm overflow-auto"
			style={{ maxHeight: "calc(100vh - 320px)" }}
		>
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-am-border">
						<th className="sticky top-0 z-10 bg-am-surface w-10 px-2" />
						<th className="sticky top-0 z-10 bg-am-surface text-left px-4 py-3 text-xs font-semibold text-am-text-muted">
							Контрагент
						</th>
						<th className="sticky top-0 z-10 bg-am-surface text-right px-4 py-3 text-xs font-semibold text-am-text-muted">
							Платежей
						</th>
						<th className="sticky top-0 z-10 bg-am-surface text-right px-4 py-3 text-xs font-semibold text-am-text-muted">
							Получено
						</th>
					</tr>
				</thead>
				<tbody>
					{groups.map((tenant) => {
						const open = expanded.has(tenant.key);
						return (
							<Fragment key={tenant.key}>
								<tr
									className="border-b border-am-border hover:bg-am-surface/80 cursor-pointer"
									onClick={() => toggle(tenant.key)}
								>
									<td className="px-2 py-3 text-center">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0"
											onClick={(e) => {
												e.stopPropagation();
												toggle(tenant.key);
											}}
										>
											{open ? (
												<ChevronDown className="w-4 h-4" />
											) : (
												<ChevronRight className="w-4 h-4" />
											)}
										</Button>
									</td>
									<td className="px-4 py-3 font-medium">
										{tenant.name}
										<span className="text-xs text-am-text-muted ml-2">
											({tenant.payments.length} плат.)
										</span>
									</td>
									<td className="px-4 py-3 text-right font-mono">
										{tenant.payments.length}
									</td>
									<td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
										{fmtCurrency(tenant.totalPaid)}
									</td>
								</tr>
								{open && (
									<tr>
										<td colSpan={4} className="p-0 bg-am-surface/50">
											<table className="w-full text-sm">
												<thead>
													<tr className="border-b border-am-border">
														<th className="text-left px-4 py-2 text-xs text-am-text-muted">
															Объект
														</th>
														<th className="text-left px-4 py-2 text-xs text-am-text-muted">
															Договор
														</th>
														<th className="text-left px-4 py-2 text-xs text-am-text-muted">
															Дата
														</th>
														<th className="text-right px-4 py-2 text-xs text-am-text-muted">
															Сумма
														</th>
														<th className="text-left px-4 py-2 text-xs text-am-text-muted">
															Способ
														</th>
														<th className="text-left px-4 py-2 text-xs text-am-text-muted">
															Примечание
														</th>
														<th className="px-4 py-2 w-10" />
													</tr>
												</thead>
												<tbody>
													{tenant.payments.map((p) => (
														<tr
															key={p.id}
															className="border-b border-am-border/60 hover:bg-white/60"
														>
															<td className="px-4 py-2 text-am-text-muted">
																{p.projectName}
															</td>
															<td className="px-4 py-2">{p.contractLabel}</td>
															<td className="px-4 py-2">
																{formatDate(p.paymentDate)}
															</td>
															<td className="px-4 py-2 text-right font-mono font-semibold text-emerald-600">
																{fmtCurrency(p.amount)}
															</td>
															<td className="px-4 py-2">
																{p.paymentMethod ? (
																	<Badge variant="outline" className="text-xs">
																		{methodLabels[p.paymentMethod] ||
																			p.paymentMethod}
																	</Badge>
																) : (
																	"—"
																)}
															</td>
															<td className="px-4 py-2 text-am-text-muted">
																{p.note || "—"}
															</td>
															<td className="px-4 py-2 text-center">
																<button
																	type="button"
																	title="Отменить платёж"
																	onClick={() => onCancel(p)}
																	className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
																>
																	<Undo2 className="w-3.5 h-3.5" />
																</button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
