import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	CircleDollarSign,
	Filter,
	Landmark,
	Receipt,
	Search,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { computePaymentAllocation } from "@/lib/payment-allocation";

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG").format(v);
}

type DueDateFilter = "all" | "today" | "week" | "month" | "quarter" | "year" | "custom";

export default function ConstructionCashier() {
	const qc = useQueryClient();
	const [search, setSearch] = useState("");
	const [selectedContract, setSelectedContract] = useState<any>(null);
	const [selectedAccrual, setSelectedAccrual] = useState<string>("none");
	const [paymentForm, setPaymentForm] = useState({
		amount: "",
		currency: "KGS",
		exchangeRate: "1",
		paymentMethod: "cash",
		accountId: "",
		date: new Date().toISOString().slice(0, 10),
		notes: "",
	});
	const [success, setSuccess] = useState<any>(null);
	const [tableMode, setTableMode] = useState<"due" | "history">("due");
	const [counterpartyFilter, setCounterpartyFilter] = useState("all");
	const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");

	const { data: contracts = [] } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: accruals = [] } = useQuery({
		queryKey: ["construction-accruals"],
		queryFn: () => api.get("/construction/accruals").then((r) => r.data),
	});
	const { data: accounts = [] } = useQuery({
		queryKey: ["construction-accounts"],
		queryFn: () => api.get("/construction/accounts").then((r) => r.data),
	});

	const accountsList = Array.isArray(accounts) ? accounts : [];

	useEffect(() => {
		if (accountsList.length > 0 && !paymentForm.accountId) {
			setPaymentForm((f) => ({ ...f, accountId: String(accountsList[0].id) }));
		}
	}, [accountsList, paymentForm.accountId]);
	const { data: operations = [] } = useQuery({
		queryKey: ["construction-operations"],
		queryFn: () => api.get("/construction/operations").then((r) => r.data),
	});

	const activeContracts = useMemo(
		() =>
			Array.isArray(contracts)
				? contracts.filter((c: any) => c.status !== "completed" && c.status !== "cancelled")
				: [],
		[contracts],
	);
	const counterpartyOptions = useMemo(() => {
		const map = new Map<string, { key: string; label: string; count: number }>();
		for (const contract of activeContracts) {
			const label = String(contract.buyerName || "Без имени").trim() || "Без имени";
			const key = contract.buyerId ? `id:${contract.buyerId}` : `name:${label.toLowerCase()}`;
			const current = map.get(key);
			if (current) {
				current.count += 1;
			} else {
				map.set(key, { key, label, count: 1 });
			}
		}
		return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"));
	}, [activeContracts]);
	const contractMatchesCounterparty = (contract?: any) => {
		if (counterpartyFilter === "all") return true;
		if (!contract) return false;
		if (counterpartyFilter.startsWith("id:")) {
			return `id:${contract.buyerId}` === counterpartyFilter;
		}
		const label = String(contract.buyerName || "Без имени").trim().toLowerCase() || "без имени";
		return `name:${label}` === counterpartyFilter;
	};
	const dateMatchesFilter = (value?: string | null) => {
		if (dueDateFilter === "all" || dueDateFilter === "custom") return true;
		if (!value) return false;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return false;
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		if (dueDateFilter === "today") end.setDate(start.getDate() + 1);
		if (dueDateFilter === "week") end.setDate(start.getDate() + 7);
		if (dueDateFilter === "month") end.setMonth(start.getMonth() + 1);
		if (dueDateFilter === "quarter") end.setMonth(start.getMonth() + 3);
		if (dueDateFilter === "year") end.setFullYear(start.getFullYear() + 1);
		return date >= start && date < end;
	};
	const contractPayments = (Array.isArray(operations) ? operations : [])
		.filter((op: any) => {
			if (
				op.type !== "income" ||
				op.category !== "Платеж по договору" ||
				op.status === "cancelled"
			) {
				return false;
			}
			const c = contracts.find((x: any) => x.id === op.contractId);
			return contractMatchesCounterparty(c) && dateMatchesFilter(op.date);
		})
		.slice(0, 30);

	const payMut = useMutation({
		mutationFn: (data: any) =>
			api.post("/construction/cashier/payment", data).then((r) => r.data),
		onSuccess: (data) => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-operations"] });
			setSuccess(data);
			toast.success("Платёж принят и записан");
		},
		onError: () => toast.error("Ошибка при проведении платежа"),
	});

	const filteredContracts = contracts.filter(
		(c: any) =>
			c.status !== "completed" &&
			c.status !== "cancelled" &&
			contractMatchesCounterparty(c) &&
			(!search ||
				c.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
				c.contractNumber?.toLowerCase().includes(search.toLowerCase())),
	);

	const contractAccruals = selectedContract
		? accruals.filter(
				(a: any) => a.contractId === selectedContract.id && a.status !== "paid",
			)
		: [];
	const selectedUpcomingAccrual = contractAccruals
		.slice()
		.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))[0];
	const selectedHasOverdue = contractAccruals.some(
		(a: any) => new Date(a.dueDate) < new Date(),
	);

	function selectContract(c: any) {
		setSelectedContract(c);
		setSelectedAccrual("none");
		setSuccess(null);
		if (c.remainingAmount) {
			const upcoming = accruals
				.filter((a: any) => a.contractId === c.id && a.status !== "paid")
				.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))[0];
			if (upcoming) {
				setSelectedAccrual(String(upcoming.id));
				setPaymentForm((f) => ({
					...f,
					amount: String(
						parseFloat(upcoming.remainingAmount || upcoming.amount || "0"),
					),
				}));
			}
		}
	}

	const payableRows = useMemo(() => {
		const contractById = new Map((Array.isArray(contracts) ? contracts : []).map((c: any) => [c.id, c]));
		return (Array.isArray(accruals) ? accruals : [])
			.filter((a: any) => a.status !== "paid")
			.map((a: any) => {
				const contract = contractById.get(a.contractId) as any;
				const remaining =
					parseFloat(a.remainingAmount || "0") ||
					Math.max(0, parseFloat(a.amount || "0") - parseFloat(a.paidAmount || "0"));
				return {
					...a,
					contract,
					buyerName: a.buyerName || contract?.buyerName || "—",
					contractNumber: a.contractNumber || contract?.contractNumber || `#${a.contractId}`,
					currency: a.currency || contract?.currency || "KGS",
					remainingValue: remaining,
					isOverdue: new Date(a.dueDate) < new Date(),
				};
			})
			.filter((row: any) => {
				if (!row.contract || row.contract.status === "completed" || row.contract.status === "cancelled") {
					return false;
				}
				if (!contractMatchesCounterparty(row.contract)) return false;
				if (!dateMatchesFilter(row.dueDate)) return false;
				const q = search.trim().toLowerCase();
				if (!q) return true;
				return (
					row.buyerName.toLowerCase().includes(q) ||
					row.contractNumber.toLowerCase().includes(q) ||
					String(row.installmentNumber).includes(q)
				);
			})
			.sort((a: any, b: any) => {
				if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
				return a.dueDate.localeCompare(b.dueDate) || a.installmentNumber - b.installmentNumber;
			});
	}, [accruals, contracts, search, counterpartyFilter, dueDateFilter]);

	function selectPaymentRow(row: any) {
		if (!row.contract) return;
		setSelectedContract(row.contract);
		setSelectedAccrual(String(row.id));
		setSuccess(null);
		setPaymentForm((f) => ({
			...f,
			amount: String(row.remainingValue || row.amount || ""),
			currency: row.currency || row.contract.currency || f.currency,
		}));
	}

	async function handlePay() {
		if (!selectedContract) return;
		if (!paymentForm.accountId) {
			toast.error("Выберите счёт зачисления");
			return;
		}
		if (willOverpay) {
			const ok = await confirmDialog(
				`Сумма больше открытых начислений на ${fmt(allocationPreview?.unallocated)} ${paymentForm.currency}. Провести платёж с переплатой?`,
			);
			if (!ok) return;
		}
		if (contractAccruals.length > 0 && allocationPreview?.lines.length === 0) {
			const ok = await confirmDialog(
				"Платёж не распределится по начислениям. Провести без привязки к графику?",
			);
			if (!ok) return;
		}
		payMut.mutate({
			contractId: selectedContract.id,
			projectId: selectedContract.projectId,
			accrualId: selectedAccrual !== "none" ? Number(selectedAccrual) : null,
			amount: paymentForm.amount,
			currency: paymentForm.currency,
			exchangeRate: paymentForm.exchangeRate,
			accountId: Number(paymentForm.accountId),
			paymentMethod: paymentForm.paymentMethod,
			date: paymentForm.date,
			notes: paymentForm.notes,
		});
	}

	const amountKgs =
		paymentForm.currency === "KGS"
			? parseFloat(paymentForm.amount || "0")
			: parseFloat(paymentForm.amount || "0") *
				parseFloat(paymentForm.exchangeRate || "1");
	const paymentAmount = parseFloat(paymentForm.amount || "0") || 0;
	const allocationPreview =
		selectedContract && paymentAmount > 0 && contractAccruals.length > 0
			? computePaymentAllocation(
					contractAccruals,
					selectedAccrual !== "none" ? Number(selectedAccrual) : null,
					paymentAmount,
				)
			: null;
	const willOverpay = (allocationPreview?.unallocated || 0) > 0.01;
	const willPartiallyPay = allocationPreview?.lines.some(
		(line) => line.status === "partial",
	);
	const selectedCounterpartyLabel =
		counterpartyFilter === "all"
			? "Контрагенты"
			: counterpartyOptions.find((item) => item.key === counterpartyFilter)?.label || "Контрагенты";
	const dueDateFilterLabels: Record<DueDateFilter, string> = {
		all: "Все сроки",
		today: "Сегодня",
		week: "Неделя",
		month: "Месяц",
		quarter: "Квартал",
		year: "Год",
		custom: "Выборочно",
	};
	const menuButtonClass =
		"flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-medium text-slate-950 transition hover:bg-slate-50";
	const checkIcon = <Check className="h-4 w-4 text-orange-500" />;

	const paymentColumns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				accessorKey: "date",
				header: "Дата",
				size: 120,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => (
					<span className="text-gray-600">{row.original.date}</span>
				),
			},
			{
				id: "contract",
				header: "Договор",
				size: 200,
				accessorFn: (row: any) => {
					const c = contracts.find((x: any) => x.id === row.contractId);
					return c?.contractNumber || `#${row.contractId}`;
				},
				meta: { exportLabel: "Договор" },
				cell: ({ row }) => {
					const op = row.original;
					const c = contracts.find((x: any) => x.id === op.contractId);
					return (
						<div>
							<div className="font-mono text-xs text-amber-600">
								{c?.contractNumber || `#${op.contractId}`}
							</div>
							<div className="text-xs text-gray-600">{c?.buyerName}</div>
						</div>
					);
				},
			},
			{
				accessorKey: "description",
				header: "Описание",
				size: 320,
				meta: { exportLabel: "Описание" },
				cell: ({ row }) => {
					const op = row.original;
					return (
						<span className="text-gray-600 text-xs">
							{op.description}
							{op.notes ? ` · ${op.notes}` : ""}
						</span>
					);
				},
			},
			{
				id: "amount",
				header: "Сумма",
				size: 140,
				accessorFn: (row: any) => parseFloat(row.amount || "0"),
				meta: { exportLabel: "Сумма (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium text-emerald-600">
						{fmt(row.original.amount)} {row.original.currency}
					</span>
				),
			},
		],
		[contracts],
	);

	return (
		<div className="am-page">
			<div className="am-page-header">
				<div className="flex items-start gap-3">
					<div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-900/15">
						<CircleDollarSign className="h-5 w-5" />
					</div>
					<div>
						<h1 className="am-page-title text-2xl">
							Приём платежей
						</h1>
						<p className="am-page-subtitle text-sm">
							Выберите договор, примите оплату и сформируйте кассовую запись
						</p>
					</div>
				</div>
			</div>

			<div className="am-panel overflow-hidden">
				<div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="grid w-full gap-2 lg:max-w-3xl lg:grid-cols-[260px_1fr]">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="h-10 justify-between px-4 text-sm"
								>
									<span className="flex min-w-0 items-center gap-2">
										<Filter className="h-5 w-5 shrink-0 text-slate-950" />
										<span className="truncate">{selectedCounterpartyLabel}</span>
									</span>
									<ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-[340px] rounded-[18px] p-0 shadow-xl">
								<div className="p-3">
									<div className="px-1 pb-2 text-base font-bold text-slate-950">Режим</div>
									<button className={menuButtonClass} onClick={() => setTableMode("due")}>
										<span>Список платежей</span>
										{tableMode === "due" && checkIcon}
									</button>
									<button className={menuButtonClass} onClick={() => setTableMode("history")}>
										<span>История платежей</span>
										{tableMode === "history" && checkIcon}
									</button>
								</div>
								<DropdownMenuSeparator />
								<div className="max-h-[240px] overflow-y-auto p-3">
									<div className="px-1 pb-2 text-base font-bold text-slate-950">Контрагент</div>
									<button className={menuButtonClass} onClick={() => setCounterpartyFilter("all")}>
										<span>Все контрагенты</span>
										{counterpartyFilter === "all" && checkIcon}
									</button>
									{counterpartyOptions.map((item) => (
										<button
											key={item.key}
											className={menuButtonClass}
											onClick={() => setCounterpartyFilter(item.key)}
										>
											<span className="truncate">
												{item.label}
												<span className="ml-2 text-sm text-slate-400">{item.count}</span>
											</span>
											{counterpartyFilter === item.key && checkIcon}
										</button>
									))}
								</div>
								<DropdownMenuSeparator />
								<div className="p-3">
									<div className="px-1 pb-2 text-base font-bold text-slate-950">Срок платежа</div>
									{(
										[
											["all", "Все сроки"],
											["today", "Сегодня"],
											["week", "Неделя"],
											["month", "Месяц"],
											["quarter", "Квартал"],
											["year", "Год"],
											["custom", "Выборочно"],
										] as const
									).map(([value, label]) => (
										<button
											key={value}
											className={menuButtonClass}
											onClick={() => setDueDateFilter(value)}
										>
											<span>{label}</span>
											{dueDateFilter === value && checkIcon}
										</button>
									))}
								</div>
								<DropdownMenuSeparator />
								<button
									className="w-full px-4 py-3 text-left text-sm font-medium text-slate-950 transition hover:bg-slate-50"
									onClick={() => {
										setCounterpartyFilter("all");
										setDueDateFilter("all");
										setSearch("");
									}}
								>
									Сбросить фильтры
								</button>
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<Input
								className="h-10 rounded-full bg-white pl-9 text-sm shadow-sm"
								placeholder="Поиск по договору, покупателю или платежу..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
						<span className="am-data-chip">
							{tableMode === "due" ? "Список платежей" : "История платежей"}
						</span>
						<span className="am-data-chip border-cyan-200 bg-cyan-50 text-cyan-800">
							{dueDateFilterLabels[dueDateFilter]}
						</span>
					</div>
				</div>

				{success && (
					<div className="m-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
							<div className="flex gap-3">
								<CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
								<div>
									<div className="font-semibold text-emerald-950">
										Платёж принят
									</div>
									<div className="text-sm text-emerald-800">
										{selectedContract?.contractNumber} · {fmt(paymentForm.amount)} {paymentForm.currency}
									</div>
									{Array.isArray(success.allocations) && success.allocations.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-2">
											{success.allocations.map((line: any) => (
												<span
													key={`${line.installmentNumber}-${line.dueDate}`}
													className="rounded-full bg-white px-2.5 py-1 text-xs text-emerald-800"
												>
													№{line.installmentNumber}: {fmt(line.applied)}
												</span>
											))}
										</div>
									)}
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => setSuccess(null)}>
									Закрыть
								</Button>
								<Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => window.print()}>
									<Receipt className="mr-2 h-4 w-4" />
									Квитанция
								</Button>
							</div>
						</div>
					</div>
				)}

				{tableMode === "history" ? (
					<div className="p-4">
						<DataTable maxHeight="calc(100vh - 320px)"
							tableId="construction-cashier"
							columns={paymentColumns}
							data={contractPayments}
							initialSorting={[{ id: "date", desc: true }]}
							emptyState="Платежей пока нет"
						/>
					</div>
				) : (
					<div className="am-table-wrap" style={{ maxHeight: "calc(100vh - 320px)" }}>
						<table className="w-full min-w-[980px] text-sm">
							<thead className="am-table-head text-left text-xs uppercase tracking-wide">
								<tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-[hsl(226_52%_9%)]">
									<th className="px-3 py-2">Срок</th>
									<th className="px-3 py-2">Договор / покупатель</th>
									<th className="px-3 py-2">Платёж</th>
									<th className="px-3 py-2 text-right">Начислено</th>
									<th className="px-3 py-2 text-right">Оплачено</th>
									<th className="px-3 py-2 text-right">Остаток</th>
									<th className="px-3 py-2 text-right">Действие</th>
								</tr>
							</thead>
							<tbody>
								{payableRows.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-10 text-center text-slate-500">
											Нет открытых начислений к оплате
										</td>
									</tr>
								) : (
									payableRows.map((row: any) => {
										const isSelected = selectedAccrual === String(row.id);
										const paid = parseFloat(row.paidAmount || "0");
										return (
											<Fragment key={row.id}>
												<tr
													className={`am-table-row ${
														isSelected ? "bg-cyan-50/70" : ""
													}`}
												>
													<td className="px-3 py-2">
														<div className={row.isOverdue ? "font-semibold text-rose-700" : "text-slate-700"}>
															{row.dueDate}
														</div>
														{row.isOverdue && (
															<div className="mt-0.5 flex items-center gap-1 text-xs text-rose-600">
																<AlertTriangle className="h-3 w-3" />
																просрочка
															</div>
														)}
													</td>
													<td className="px-3 py-2">
														<div className="font-mono text-xs font-semibold text-cyan-700">
															{row.contractNumber}
														</div>
														<div className="font-medium text-slate-900">{row.buyerName}</div>
													</td>
													<td className="px-3 py-2">
														<div className="font-semibold text-slate-900">
															№{row.installmentNumber}
														</div>
														<div className="text-xs text-slate-500">{row.status}</div>
													</td>
													<td className="px-3 py-2 text-right font-mono">
														{fmt(row.amount)} {row.currency}
													</td>
													<td className="px-3 py-2 text-right font-mono text-emerald-700">
														{fmt(paid)}
													</td>
													<td className="px-3 py-2 text-right font-mono font-semibold text-cyan-800">
														{fmt(row.remainingValue)}
													</td>
													<td className="px-3 py-2 text-right">
														<Button
															size="sm"
															variant={isSelected ? "default" : "outline"}
															className={isSelected ? "bg-cyan-700 hover:bg-cyan-800" : ""}
															onClick={() => selectPaymentRow(row)}
														>
															{isSelected ? "Выбрано" : "Принять"}
														</Button>
													</td>
												</tr>
												{isSelected && selectedContract && (
													<tr className="border-b border-cyan-100 bg-cyan-50/40">
														<td colSpan={7} className="px-4 py-4">
															<div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
																<div className="grid gap-3 md:grid-cols-4">
																	<div>
																		<Label className="text-xs">Сумма *</Label>
																		<Input
																			type="number"
																			value={paymentForm.amount}
																			onChange={(e) =>
																				setPaymentForm((f) => ({ ...f, amount: e.target.value }))
																			}
																			className="mt-1 h-9 bg-white text-sm"
																		/>
																	</div>
																	<div>
																		<Label className="text-xs">Валюта</Label>
																		<Select
																			value={paymentForm.currency}
																			onValueChange={(v) => setPaymentForm((f) => ({ ...f, currency: v }))}
																		>
																			<SelectTrigger className="mt-1 h-9 bg-white text-sm">
																				<SelectValue />
																			</SelectTrigger>
																			<SelectContent>
																				{["KGS", "USD", "EUR"].map((c) => (
																					<SelectItem key={c} value={c}>{c}</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	</div>
																	<div>
																		<Label className="text-xs">Способ</Label>
																		<Select
																			value={paymentForm.paymentMethod}
																			onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v }))}
																		>
																			<SelectTrigger className="mt-1 h-9 bg-white text-sm">
																				<SelectValue />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value="cash">Наличные</SelectItem>
																				<SelectItem value="transfer">Перевод</SelectItem>
																				<SelectItem value="card">Карта</SelectItem>
																			</SelectContent>
																		</Select>
																	</div>
																	<div>
																		<Label className="text-xs">Счёт *</Label>
																		<Select
																			value={paymentForm.accountId}
																			onValueChange={(v) => setPaymentForm((f) => ({ ...f, accountId: v }))}
																		>
																			<SelectTrigger className="mt-1 h-9 bg-white text-sm">
																				<SelectValue placeholder="Счёт" />
																			</SelectTrigger>
																			<SelectContent>
																				{accountsList.map((a: any) => (
																					<SelectItem key={a.id} value={String(a.id)}>
																						{a.name} ({a.currency})
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	</div>
																	{paymentForm.currency !== "KGS" && (
																		<div>
																			<Label className="text-xs">Курс</Label>
																			<Input
																				type="number"
																				value={paymentForm.exchangeRate}
																				onChange={(e) =>
																					setPaymentForm((f) => ({ ...f, exchangeRate: e.target.value }))
																				}
																				className="mt-1 h-9 bg-white text-sm"
																			/>
																			<div className="mt-1 text-xs text-cyan-800">
																				Итого KGS: {fmt(amountKgs)}
																			</div>
																		</div>
																	)}
																	<div>
																		<Label className="text-xs">Дата</Label>
																		<Input
																			type="date"
																			value={paymentForm.date}
																			onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
																			className="mt-1 h-9 bg-white text-sm"
																		/>
																	</div>
																	<div className="md:col-span-3">
																		<Label className="text-xs">Примечание</Label>
																		<Textarea
																			value={paymentForm.notes}
																			onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
																			className="mt-1 min-h-[38px] bg-white text-sm"
																			rows={1}
																		/>
																	</div>
																	<div className="md:col-span-4">
																		<Button
																			className="h-11 w-full rounded-2xl bg-cyan-700 text-white hover:bg-cyan-800"
																			disabled={
																				payMut.isPending ||
																				!paymentForm.amount ||
																				parseFloat(paymentForm.amount) <= 0 ||
																				!paymentForm.accountId
																			}
																			onClick={handlePay}
																		>
																			<Landmark className="mr-2 h-4 w-4" />
																			{payMut.isPending
																				? "Проведение..."
																				: `Принять ${fmt(paymentForm.amount)} ${paymentForm.currency}`}
																		</Button>
																	</div>
																</div>

																<div className="rounded-2xl border border-white bg-white/80 p-3">
																	<div className="mb-2 flex flex-wrap items-center gap-2">
																		<div className="text-xs font-semibold uppercase text-slate-500">
																			Распределение
																		</div>
																		{willPartiallyPay && (
																			<span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
																				частично
																			</span>
																		)}
																		{willOverpay && (
																			<span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
																				переплата {fmt(allocationPreview?.unallocated)}
																			</span>
																		)}
																	</div>
																	{allocationPreview?.lines.length ? (
																		<div className="space-y-2">
																			{allocationPreview.lines.map((line) => (
																				<div key={line.accrualId} className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
																					<span>№{line.installmentNumber} · {line.dueDate}</span>
																					<span className="font-mono text-right">
																						+{fmt(line.applied)} · ост. {fmt(line.remainingAfter)}
																					</span>
																				</div>
																			))}
																		</div>
																	) : (
																		<p className="text-xs text-slate-500">
																			Платёж будет записан без распределения по графику.
																		</p>
																	)}
																</div>
															</div>
														</td>
													</tr>
												)}
											</Fragment>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
