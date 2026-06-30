import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	FileText,
	Printer,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useListProperties } from "@/api-client";
import { DataTable } from "@/components/data-table";
import { defaultPeriod, PeriodPicker, type PeriodValue } from "@/components/period-picker";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { authFetch } from "@/lib/auth-fetch";

interface OwnerStatement {
	id: number;
	propertyId: number;
	period: string;
	rentCharged: string;
	rentReceived: string;
	expenses: string;
	netIncome: string;
	currency: string;
	generatedAt: string;
	unitNumber?: string;
}

async function fetchStatements(
	propertyId?: string,
	month?: string,
): Promise<OwnerStatement[]> {
	const params = new URLSearchParams();
	if (propertyId && propertyId !== "all") params.set("propertyId", propertyId);
	if (month) params.set("month", month);
	const res = await authFetch(`/rental/statements?${params}`);
	return res.json();
}

async function generateStatement(
	propertyId: number,
	period: string,
): Promise<OwnerStatement> {
	const res = await authFetch("/rental/statements/generate", {
		method: "POST",
		body: JSON.stringify({ propertyId, period }),
	});
	return res.json();
}

/** Месяц YYYY-MM для API — только если выбран один календарный месяц. */
function apiMonthFilter(period: PeriodValue): string | undefined {
	if (period.preset === "month" || period.preset === "prev_month") {
		return period.from.slice(0, 7);
	}
	if (period.from.slice(0, 7) === period.to.slice(0, 7)) {
		return period.from.slice(0, 7);
	}
	return undefined;
}

/** Месяц для генерации акта (один календарный месяц). */
function generateMonthFromPeriod(period: PeriodValue): string | null {
	const fromMonth = period.from.slice(0, 7);
	const toMonth = period.to.slice(0, 7);
	if (fromMonth === toMonth) return fromMonth;
	if (period.preset === "month" || period.preset === "prev_month") {
		return fromMonth;
	}
	return null;
}

function statementPeriodInRange(
	statementPeriod: string,
	range: PeriodValue,
): boolean {
	const [y, m] = statementPeriod.split("-").map(Number);
	if (!y || !m) return false;
	const monthStart = `${statementPeriod}-01`;
	const lastDay = new Date(y, m, 0).getDate();
	const monthEnd = `${statementPeriod}-${String(lastDay).padStart(2, "0")}`;
	return monthEnd >= range.from && monthStart <= range.to;
}

function fmtKGS(amount: string | number) {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	return new Intl.NumberFormat("ru-KG", {
		style: "currency",
		currency: "KGS",
		minimumFractionDigits: 2,
	}).format(num);
}

function fmtPeriod(period: string) {
	if (!period) return "—";
	const [year, month] = period.split("-");
	const monthIdx = parseInt(month, 10) - 1;
	if (monthIdx < 0 || monthIdx > 11) return period;
	const months = [
		"Январь",
		"Февраль",
		"Март",
		"Апрель",
		"Май",
		"Июнь",
		"Июль",
		"Август",
		"Сентябрь",
		"Октябрь",
		"Ноябрь",
		"Декабрь",
	];
	return `${months[monthIdx]} ${year}`;
}

export default function OwnerStatements() {
	const [propertyFilter, setPropertyFilter] = useState("all");
	const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());
	const apiMonth = apiMonthFilter(period);
	const generateMonth = generateMonthFromPeriod(period);
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectedStatement, setSelectedStatement] =
		useState<OwnerStatement | null>(null);
	const { data: properties } = useListProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const propertyLabelById = useMemo(() => {
		const map = new Map<number, string>();
		for (const p of propertiesArray) {
			map.set(Number(p.id), `${p.projectName} — ${p.unitNumber}`);
		}
		return map;
	}, [propertiesArray]);
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: statementsRaw, isLoading, isError, error } = useQuery({
		queryKey: ["owner-statements", propertyFilter, apiMonth],
		queryFn: () => fetchStatements(propertyFilter, apiMonth),
	});
	const statementsArray = useMemo(() => {
		const arr = Array.isArray(statementsRaw) ? statementsRaw : [];
		if (apiMonth) return arr;
		return arr.filter((s) => statementPeriodInRange(s.period, period));
	}, [statementsRaw, apiMonth, period]);
	const enrichedStatements = useMemo(
		() =>
			statementsArray.map((s) => ({
				...s,
				propertyLabel:
					propertyLabelById.get(Number(s.propertyId)) ||
					s.unitNumber ||
					`Объект #${s.propertyId}`,
				periodLabel: fmtPeriod(s.period),
				chargedNum: parseFloat(String(s.rentCharged || 0)),
				receivedNum: parseFloat(String(s.rentReceived || 0)),
				expensesNum: parseFloat(String(s.expenses || 0)),
				netNum: parseFloat(String(s.netIncome || 0)),
				collectionPct:
					parseFloat(String(s.rentCharged || 0)) > 0
						? (
								(parseFloat(String(s.rentReceived || 0)) /
									parseFloat(String(s.rentCharged || 0))) *
								100
							).toFixed(0)
						: "0",
			})),
		[statementsArray, propertyLabelById],
	);
	type EnrichedStatement = (typeof enrichedStatements)[number];

	const tableColumns = useMemo<ColumnDef<EnrichedStatement, unknown>[]>(
		() => [
			{
				id: "propertyLabel",
				header: "Объект",
				size: 140,
				accessorFn: (row) => row.propertyLabel,
				meta: { exportLabel: "Объект", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.propertyLabel}</span>
				),
			},
			{
				id: "period",
				header: "Период",
				size: 120,
				accessorFn: (row) => row.period,
				meta: { exportLabel: "Период" },
				cell: ({ row }) => row.original.periodLabel,
			},
			{
				id: "rentCharged",
				header: "Начислено",
				size: 120,
				accessorFn: (row) => row.chargedNum,
				meta: { exportLabel: "Начислено", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-blue-600 font-medium">
						{fmtKGS(row.original.chargedNum)}
					</span>
				),
			},
			{
				id: "rentReceived",
				header: "Собрано",
				size: 130,
				accessorFn: (row) => row.receivedNum,
				meta: { exportLabel: "Собрано", align: "right" },
				cell: ({ row }) => (
					<span>
						<span className="font-mono text-emerald-600 font-medium">
							{fmtKGS(row.original.receivedNum)}
						</span>
						<span className="text-muted-foreground ml-1 text-xs">
							{row.original.collectionPct}%
						</span>
					</span>
				),
			},
			{
				id: "expenses",
				header: "Расходы",
				size: 110,
				accessorFn: (row) => row.expensesNum,
				meta: { exportLabel: "Расходы", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-rose-600">
						{fmtKGS(row.original.expensesNum)}
					</span>
				),
			},
			{
				id: "netIncome",
				header: "Чистый доход",
				size: 130,
				accessorFn: (row) => row.netNum,
				meta: { exportLabel: "Чистый доход", align: "right" },
				cell: ({ row }) => (
					<span
						className={`font-mono font-semibold ${row.original.netNum >= 0 ? "text-emerald-700" : "text-rose-600"}`}
					>
						{row.original.netNum >= 0 ? "+" : ""}
						{fmtKGS(row.original.netNum)}
					</span>
				),
			},
			{
				id: "generatedAt",
				header: "Сформирован",
				size: 110,
				accessorFn: (row) => row.generatedAt,
				meta: { exportLabel: "Сформирован" },
				cell: ({ row }) =>
					new Date(row.original.generatedAt).toLocaleDateString("ru-KG"),
			},
			{
				id: "actions",
				header: "",
				size: 80,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							setSelectedStatement(row.original);
						}}
						className="gap-1 text-xs"
					>
						<FileText className="w-3.5 h-3.5" /> Акт
					</Button>
				),
			},
		],
		[],
	);

	const { data: expenses = [] } = useQuery<
		{
			id: number;
			propertyId?: number;
			expenseDate?: string;
			createdAt?: string;
			description?: string;
			category?: string;
			amount: string | number;
		}[]
	>({
		queryKey: [
			"rental-expenses",
			selectedStatement?.propertyId,
			selectedStatement?.period,
		],
		queryFn: () =>
			api
				.get("/rental/expenses", {
					params: { propertyId: String(selectedStatement!.propertyId) },
				})
				.then((r) => r.data),
		enabled: !!selectedStatement,
	});
	const expensesArray = Array.isArray(expenses) ? expenses : [];
	const modalExpenses = useMemo(() => {
		if (!selectedStatement) return [];
		const [year, month] = selectedStatement.period.split("-");
		const prefix = `${year}-${month}`;
		return expensesArray.filter((e) => {
			const eDate = e.expenseDate || e.createdAt || "";
			return eDate.startsWith(prefix);
		});
	}, [expensesArray, selectedStatement]);

	const handleGenerate = async () => {
		if (propertyFilter === "all") {
			toast({
				title: "Выберите конкретный объект",
				description: "Для формирования акта выберите объект из списка",
				variant: "destructive",
			});
			return;
		}
		if (!generateMonth) {
			toast({
				title: "Выберите один месяц",
				description:
					"Для формирования акта укажите период в пределах одного календарного месяца",
				variant: "destructive",
			});
			return;
		}
		const propertyId = parseInt(propertyFilter, 10);
		if (
			statementsArray.some(
				(s) =>
					Number(s.propertyId) === propertyId && s.period === generateMonth,
			)
		) {
			toast({
				title: "Акт уже существует",
				description: `Для этого объекта за ${fmtPeriod(generateMonth)} акт уже сформирован`,
				variant: "destructive",
			});
			return;
		}
		setIsGenerating(true);
		try {
			await generateStatement(propertyId, generateMonth);
			toast({ title: "Акт сформирован" });
			queryClient.invalidateQueries({ queryKey: ["owner-statements"] });
		} catch (e) {
			toast({
				title: "Ошибка",
				description: getApiErrorMessage(e, "Не удалось сформировать акт"),
				variant: "destructive",
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const totalCharged = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.rentCharged || 0)),
		0,
	);
	const totalReceived = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.rentReceived || 0)),
		0,
	);
	const totalExpenses = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.expenses || 0)),
		0,
	);
	const totalNet = statementsArray.reduce(
		(s, r) => s + parseFloat(String(r.netIncome || 0)),
		0,
	);

	return (
		<div className="space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Начислено" value={fmtKGS(totalCharged)} sub="за период" icon={TrendingUp} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Собрано" value={fmtKGS(totalReceived)} sub="за период" icon={Wallet} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Расходы" value={fmtKGS(totalExpenses)} sub="за период" icon={TrendingDown} color="red" loading={isLoading} />
				<KpiCard
					variant="strip"
					label="Чистый доход"
					value={`${totalNet >= 0 ? "+" : ""}${fmtKGS(totalNet)}`}
					sub={`${statementsArray.length} актов`}
					icon={FileText}
					color={totalNet >= 0 ? "green" : "red"}
					loading={isLoading}
				/>
			</KpiRow>

			<div className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Акты собственников
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Ежемесячные отчёты о доходах и расходах по объектам
					</p>
				</div>
			</div>

			{/* Unified filters + generate row */}
			<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
				<p className="text-sm font-semibold text-gray-700 mb-3">
					Фильтр и формирование актов
				</p>
				<div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
					<Select value={propertyFilter} onValueChange={setPropertyFilter}>
						<SelectTrigger className="h-10 w-[168px] shrink-0">
							<SelectValue placeholder="Все объекты" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все объекты</SelectItem>
							{propertiesArray.map((p) => (
								<SelectItem key={p.id} value={String(p.id)}>
									{p.projectName} — {p.unitNumber}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<PeriodPicker
						value={period}
						onChange={setPeriod}
						className="shrink-0"
					/>

					<Button
						onClick={handleGenerate}
						disabled={
							isGenerating || propertyFilter === "all" || !generateMonth
						}
						className="h-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-2"
					>
						<RefreshCw
							className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
						/>
						{isGenerating ? "Формирование..." : "Сформировать акт"}
					</Button>
				</div>
				{propertyFilter === "all" && (
					<p className="text-xs text-amber-600 mt-2">
						Для формирования нового акта выберите конкретный объект
					</p>
				)}
				{propertyFilter !== "all" && !generateMonth && (
					<p className="text-xs text-amber-600 mt-2">
						Для формирования акта выберите период в пределах одного календарного
						месяца
					</p>
				)}
			</div>

			{isError && (
				<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{getApiErrorMessage(error, "Не удалось загрузить акты")}
				</div>
			)}

			<DataTable maxHeight="calc(100vh - 320px)"
					tableId="rental-statements"
					columns={tableColumns}
					data={enrichedStatements}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по объекту, периоду…"
					initialSorting={[{ id: "period", desc: true }]}
					onRowClick={(row) => setSelectedStatement(row)}
					emptyState={
						<div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
							<FileText className="w-10 h-10 opacity-20" />
							<span>
								Актов не найдено. Выберите объект и нажмите «Сформировать акт».
							</span>
						</div>
					}
					footer={
						statementsArray.length > 0 ? (
							<tr className="bg-gray-50 font-semibold border-t-2">
								<td colSpan={2} className="px-3 py-2 text-sm text-gray-600">
									Итого: {statementsArray.length}
								</td>
								<td className="px-3 py-2 font-mono text-right text-blue-600">
									{fmtKGS(totalCharged)}
								</td>
								<td className="px-3 py-2 font-mono text-right text-emerald-600">
									{fmtKGS(totalReceived)}
								</td>
								<td className="px-3 py-2 font-mono text-right text-rose-600">
									{fmtKGS(totalExpenses)}
								</td>
								<td
									className={`px-3 py-2 font-mono text-right ${totalNet >= 0 ? "text-emerald-700" : "text-rose-600"}`}
								>
									{totalNet >= 0 ? "+" : ""}
									{fmtKGS(totalNet)}
								</td>
								<td colSpan={2} />
							</tr>
						) : undefined
					}
				/>

			{/* Reconciliation act modal */}
			{selectedStatement && (
				<div className="fixed inset-0 bg-slate-950/50 z-50 flex items-start justify-center p-4 pt-12 overflow-auto">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b no-print">
							<h2 className="font-bold text-gray-900">Акт сверки расчётов</h2>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => window.print()}
									className="gap-1.5 text-xs"
								>
									<Printer className="w-3.5 h-3.5" /> Печать
								</Button>
								<button
									onClick={() => setSelectedStatement(null)}
									className="text-gray-600 hover:text-gray-600"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						</div>

						<div className="px-6 py-5 space-y-5 print-content">
							{/* Header */}
							<div className="border-b pb-4">
								<h3 className="text-lg font-bold text-center text-gray-900">
									АКТ СВЕРКИ РАСЧЁТОВ
								</h3>
								<p className="text-center text-sm text-gray-500 mt-1">
									Период: {fmtPeriod(selectedStatement.period)}
								</p>
								<p className="text-center text-sm text-gray-600 font-medium mt-0.5">
									Объект:{" "}
									{propertyLabelById.get(Number(selectedStatement.propertyId)) ||
										selectedStatement.unitNumber ||
										`#${selectedStatement.propertyId}`}
								</p>
							</div>

							{/* Main reconciliation table */}
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50 text-xs text-gray-500 uppercase">
										<th className="text-left px-3 py-2 font-medium">Статья</th>
										<th className="text-right px-3 py-2 font-medium">
											Сумма (KGS)
										</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-b">
										<td className="px-3 py-3 text-gray-700 font-medium">
											Начислено аренды
										</td>
										<td className="px-3 py-3 text-right font-bold text-blue-700">
											{fmtKGS(selectedStatement.rentCharged)}
										</td>
									</tr>
									<tr className="border-b bg-emerald-50/30">
										<td className="px-3 py-3 text-gray-700">
											Оплачено (собрано)
										</td>
										<td className="px-3 py-3 text-right font-bold text-emerald-700">
											+{fmtKGS(selectedStatement.rentReceived)}
										</td>
									</tr>
									<tr className="border-b">
										<td className="px-3 py-3 text-gray-500 pl-8 text-xs">
											— Задолженность арендатора
										</td>
										<td className="px-3 py-3 text-right text-xs text-amber-600">
											{fmtKGS(
												parseFloat(selectedStatement.rentCharged) -
													parseFloat(selectedStatement.rentReceived),
											)}
										</td>
									</tr>
									<tr className="border-b bg-rose-50/30">
										<td className="px-3 py-3 text-gray-700">
											Расходы по объекту
										</td>
										<td className="px-3 py-3 text-right font-bold text-rose-600">
											-{fmtKGS(selectedStatement.expenses)}
										</td>
									</tr>
									{/* Expense breakdown for this property */}
									{modalExpenses.map((e) => (
											<tr key={e.id} className="border-b text-xs">
												<td className="px-3 py-2 text-gray-600 pl-8">
													— {e.description || e.category || "Расход"}
												</td>
												<td className="px-3 py-2 text-right text-rose-600">
													{fmtKGS(e.amount)}
												</td>
											</tr>
										))}
									<tr className="bg-gray-100 border-t-2">
										<td className="px-3 py-3 font-bold text-gray-900">
											ЧИСТЫЙ ДОХОД
										</td>
										<td
											className={`px-3 py-3 text-right font-bold text-lg ${parseFloat(selectedStatement.netIncome) >= 0 ? "text-emerald-700" : "text-rose-600"}`}
										>
											{parseFloat(selectedStatement.netIncome) >= 0 ? "+" : ""}
											{fmtKGS(selectedStatement.netIncome)}
										</td>
									</tr>
								</tbody>
							</table>

							{/* Collection rate */}
							<div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-blue-900">
										Процент сбора аренды
									</p>
									<p className="text-xs text-blue-600 mt-0.5">
										Собрано от начисленного
									</p>
								</div>
								<p className="am-kpi-value text-2xl text-blue-700">
									{parseFloat(selectedStatement.rentCharged) > 0
										? (
												(parseFloat(selectedStatement.rentReceived) /
													parseFloat(selectedStatement.rentCharged)) *
												100
											).toFixed(1)
										: "0"}
									%
								</p>
							</div>

							<div className="text-center text-xs text-gray-600 pt-2">
								Сформирован:{" "}
								{new Date(selectedStatement.generatedAt).toLocaleString(
									"ru-KG",
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
