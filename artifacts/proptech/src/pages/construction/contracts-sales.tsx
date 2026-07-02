import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ExternalLink, Eye, FileText, Plus, UserPlus, XCircle } from "lucide-react";
import { ContractTerminationDialog } from "@/components/contract-termination-dialog";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Field,
	FormGrid,
	FormSection,
	MoneyInput,
	PageShell,
	Status,
	Tablo,
} from "@/components/am";
import { ContractStatusStepper } from "@/components/contract-status-stepper";
import { ContractTab } from "@/components/contract-tab";
import { ContractFileUpload } from "@/components/contract-file-upload";
import { DocumentsSection } from "@/components/documents-section";
import { PortalPreviewDialog } from "@/components/portal-preview-dialog";
import {
	AdminReconciliationAct,
	reconciliationFmtMoney,
} from "@/components/admin-reconciliation-act";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CONTRACT_STATUS_OPTIONS = [
	{ value: "draft", label: "Черновик" },
	{ value: "review", label: "На утверждение" },
	{ value: "signed", label: "Подписан" },
	{ value: "completed", label: "Завершён" },
	{ value: "cancelled", label: "Расторгнут" },
] as const;

function fmt(n: any) {
	const v = parseFloat(n);
	if (Number.isNaN(v)) return "0";
	return new Intl.NumberFormat("ru-KG").format(v);
}

function ContractDetailSummary({
	contract,
	proj,
	statusMut,
	scheduleMut,
	onRefresh,
	hideReconciliation,
}: {
	contract: any;
	proj: any;
	statusMut: any;
	scheduleMut: any;
	onRefresh: () => void;
	hideReconciliation?: boolean;
}) {
	const { data: reconciliationData } = useQuery({
		queryKey: ["contract-sales-reconciliation", contract.id],
		queryFn: () =>
			api
				.get(`/construction/contracts-sales/${contract.id}/reconciliation`)
				.then((r) => r.data),
		enabled: !hideReconciliation,
	});

	const reconciliation = reconciliationData?.reconciliation;
	const currency = contract.currency || "KGS";

	return (
		<div className="space-y-4 mt-4">
			<div className="grid gap-3 sm:grid-cols-2 text-sm">
				<div>
					<span className="text-gray-500">Покупатель:</span>{" "}
					<span className="font-medium">{contract.buyerName}</span>
				</div>
				<div>
					<span className="text-gray-500">Телефон:</span>{" "}
					<span>{contract.buyerPhone || "—"}</span>
				</div>
				<div>
					<span className="text-gray-500">Проект:</span>{" "}
					<span>{proj?.name || "—"}</span>
				</div>
				<div>
					<span className="text-gray-500">Дата:</span>{" "}
					<span>{contract.contractDate}</span>
				</div>
			</div>
			<div className="grid gap-2 sm:grid-cols-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center text-sm">
				<div>
					<div className="text-xs text-slate-500">Сумма</div>
					<div className="font-bold">
						{fmt(contract.totalAmount)} {currency}
					</div>
				</div>
				<div>
					<div className="text-xs text-slate-500">Оплачено</div>
					<div className="font-bold text-emerald-600">{fmt(contract.paidAmount)}</div>
				</div>
				<div>
					<div className="text-xs text-slate-500">Остаток</div>
					<div className="font-bold text-cyan-700">{fmt(contract.remainingAmount)}</div>
				</div>
			</div>

			<SalesContractPortalAccess
				contract={contract}
				variant="card"
				onRefresh={onRefresh}
			/>

			<ContractStatusStepper
				status={contract.status}
				loading={statusMut.isPending}
				onStatusChange={(nextStatus: string) =>
					statusMut.mutate({ id: contract.id, status: nextStatus })
				}
			/>
			<div className="rounded-2xl border border-cyan-100 bg-cyan-50/45 p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-sm font-semibold text-slate-950">График платежей</p>
						<p className="mt-1 text-xs text-slate-600">
							Создаёт начисления по договору, чтобы их можно было контролировать
							в финансах и кассе.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							className="bg-cyan-700 hover:bg-cyan-800"
							onClick={() => scheduleMut.mutate(contract.id)}
							disabled={scheduleMut.isPending}
						>
							{scheduleMut.isPending ? "Генерация..." : "Сформировать график"}
						</Button>
						<Link href="/construction/accruals">
							<Button variant="outline" className="border-cyan-200 text-cyan-800 hover:bg-white">
								Открыть начисления
							</Button>
						</Link>
					</div>
				</div>
			</div>

			<ContractFileUpload
				entityType="buyer"
				entityId={contract.id}
				contractDocument={contract.contractDocument}
				onUploaded={onRefresh}
				portalPrompt={
					contract.buyerId
						? {
								entityType: "buyer",
								entityId: contract.buyerId,
								entityName: contract.buyerName,
								defaultEmail: contract.buyerEmail || "",
							}
						: undefined
				}
			/>

			{!hideReconciliation && reconciliation && (
				<AdminReconciliationAct
					mode="buyer"
					subjectLabel="Покупатель"
					subjectName={contract.buyerName || "—"}
					contractLabel={`Договор №${contract.contractNumber}`}
					currency={reconciliation.currency ?? currency}
					summary={[
						{
							label: "Договор",
							value: reconciliationFmtMoney(reconciliation.contractAmount, currency),
						},
						{
							label: "По графику",
							value: reconciliationFmtMoney(reconciliation.totalCharged, currency),
						},
						{
							label: "Оплачено",
							value: reconciliationFmtMoney(reconciliation.totalPaid, currency),
							tone: "emerald",
						},
						{
							label: "Остаток",
							value: reconciliationFmtMoney(reconciliation.outstanding, currency),
							tone: "amber",
						},
					]}
					lines={reconciliation.lines ?? []}
				/>
			)}
		</div>
	);
}

function splitBuyerName(fullName: string) {
	const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
	return {
		firstName: parts[0] || "",
		lastName: parts.slice(1).join(" ") || "",
	};
}

function SalesContractPortalAccess({
	contract,
	variant = "row",
	onRefresh,
}: {
	contract: any;
	variant?: "row" | "card";
	onRefresh?: () => void;
}) {
	const qc = useQueryClient();
	const [, navigate] = useLocation();
	const [formOpen, setFormOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [form, setForm] = useState(() => ({
		phone: contract.buyerPhone || "",
		email: contract.buyerEmail || "",
		...splitBuyerName(contract.buyerName || ""),
	}));

	const { data: status } = useQuery({
		queryKey: ["portal-account-status", "buyer", contract.buyerId],
		queryFn: () =>
			api
				.get(`/portal/account-status/buyer/${contract.buyerId}`)
				.then((r) => r.data),
		enabled: !!contract.buyerId,
	});

	useEffect(() => {
		if (!formOpen) return;
		setForm({
			phone: contract.buyerPhone || "",
			email: contract.buyerEmail || "",
			...splitBuyerName(contract.buyerName || ""),
		});
	}, [formOpen, contract.buyerName, contract.buyerEmail, contract.buyerPhone]);

	const portalEnabled = Boolean(status?.exists);
	const portalLogin = status?.phone || status?.email || contract.buyerPhone || "—";

	const createPortalMutation = useMutation({
		mutationFn: () =>
			api
				.post("/portal/create-buyer-account", {
					buyerId: contract.buyerId || undefined,
					contractId: contract.id,
					buyerName:
						contract.buyerName ||
						`${form.firstName} ${form.lastName}`.trim(),
					phone: form.phone,
					email: form.email || undefined,
					firstName: form.firstName,
					lastName: form.lastName,
				})
				.then((r) => r.data),
		onSuccess: () => {
			setFormOpen(false);
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["portal-account-status"] });
			onRefresh?.();
			toast.success("Доступ в портал покупателя создан");
		},
		onError: (err: unknown) => {
			toast.error(getApiErrorMessage(err, "Не удалось создать доступ в портал"));
		},
	});

	const submit = () => {
		if (!form.phone || !form.firstName || !form.lastName) {
			toast.error("Заполните телефон, имя и фамилию");
			return;
		}
		createPortalMutation.mutate();
	};

	const controls = (
		<div className="flex flex-wrap items-center gap-2">
			{contract.buyerId && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => setPreviewOpen(true)}
				>
					<Eye className="h-3.5 w-3.5" />
					Глазами покупателя
				</Button>
			)}
			{contract.buyerId && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={() => navigate(`/admin/portal/buyer/${contract.buyerId}`)}
				>
					<ExternalLink className="h-3.5 w-3.5" />
					Портал
				</Button>
			)}
			<Button
				type="button"
				variant={portalEnabled ? "outline" : "default"}
				size="sm"
				className={portalEnabled ? "gap-1.5" : "gap-1.5 bg-am-brand hover:bg-am-brand-hover"}
				onClick={() => setFormOpen(true)}
			>
				<UserPlus className="h-3.5 w-3.5" />
				{portalEnabled ? "Изменить доступ" : "Создать доступ"}
			</Button>
		</div>
	);

	return (
		<>
			{variant === "card" ? (
				<div className="rounded-2xl border border-am-border bg-white p-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-am-text-muted">
								Портал покупателя
							</p>
							<p className="mt-1 text-sm font-semibold text-am-text-strong">
								{portalEnabled ? "Доступ открыт" : "Доступ ещё не создан"}
							</p>
							<p className="mt-0.5 text-xs text-am-text-muted">
								{portalEnabled
									? `Вход: ${portalLogin}`
									: "Покупатель сможет видеть договор, платежи, документы и новости портала."}
							</p>
						</div>
						{controls}
					</div>
				</div>
			) : (
				<div className="flex min-w-[220px] items-center justify-between gap-2">
					<div className="min-w-0">
						<p className={`text-[11px] font-semibold ${portalEnabled ? "text-emerald-700" : "text-am-text-muted"}`}>
							{portalEnabled ? "Открыт" : "Нет доступа"}
						</p>
						<p className="truncate text-[10px] text-am-text-subtle" title={portalLogin}>
							{portalEnabled ? portalLogin : "создать из договора"}
						</p>
					</div>
					<div className="flex items-center gap-1">
						{contract.buyerId && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={(e) => {
									e.stopPropagation();
									setPreviewOpen(true);
								}}
								title="Глазами покупателя"
							>
								<Eye className="h-3.5 w-3.5" />
							</Button>
						)}
						<Button
							type="button"
							variant={portalEnabled ? "outline" : "default"}
							size="sm"
							className={portalEnabled ? "h-8 rounded-full px-3" : "h-8 rounded-full bg-am-brand px-3 hover:bg-am-brand-hover"}
							onClick={(e) => {
								e.stopPropagation();
								setFormOpen(true);
							}}
						>
							{portalEnabled ? "Доступ" : "Открыть"}
						</Button>
					</div>
				</div>
			)}

			<Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Доступ в портал покупателя</DialogTitle>
						<DialogDescription>
							Договор {contract.contractNumber}. Покупатель войдёт по номеру телефона и SMS-коду.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Телефон *</Label>
							<Input
								className="mt-1"
								type="tel"
								placeholder="+996 700 123 456"
								value={form.phone}
								onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
							/>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<Label>Имя *</Label>
								<Input
									className="mt-1"
									value={form.firstName}
									onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Фамилия *</Label>
								<Input
									className="mt-1"
									value={form.lastName}
									onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
								/>
							</div>
						</div>
						<div>
							<Label>Email (необязательно)</Label>
							<Input
								className="mt-1"
								type="email"
								value={form.email}
								onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
							/>
						</div>
						<div className="flex gap-2 pt-2">
							<Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
								Отмена
							</Button>
							<Button
								className="flex-1 bg-am-brand hover:bg-am-brand-hover"
								onClick={submit}
								disabled={createPortalMutation.isPending}
							>
								{createPortalMutation.isPending ? "Сохранение..." : "Сохранить доступ"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{contract.buyerId && (
				<PortalPreviewDialog
					type="buyer"
					id={contract.buyerId}
					open={previewOpen}
					onClose={() => setPreviewOpen(false)}
				/>
			)}
		</>
	);
}

export default function ConstructionContractsSales() {
	const qc = useQueryClient();
	const { user } = useAuth();
	const isSalesOnly = user?.role === "sales_manager";
	const urlSearch = useSearch();
	const urlParams = new URLSearchParams(urlSearch);
	const highlightFromUrl = urlParams.get("highlight");
	const statusFromUrl = urlParams.get("status");

	const [open, setOpen] = useState(false);
	const [detailId, setDetailId] = useState<number | null>(null);
	const [terminationContractId, setTerminationContractId] = useState<number | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>(
		statusFromUrl || "all",
	);
	const [form, setForm] = useState({
		projectId: "",
		unitId: "",
		unitIds: [] as string[],
		buyerName: "",
		buyerPhone: "",
		totalAmount: "",
		downPayment: "",
		installmentMonths: "12",
		currency: "KGS",
		exchangeRate: "1",
		contractDate: new Date().toISOString().slice(0, 10),
		notes: "",
		status: "draft",
	});

	const { data: contracts = [], isLoading } = useQuery({
		queryKey: ["construction-contracts-sales"],
		queryFn: () => api.get("/construction/contracts-sales").then((r) => r.data),
	});
	const { data: projects = [] } = useQuery({
		queryKey: ["construction-projects"],
		queryFn: () => api.get("/construction/projects/all").then((r) => r.data),
	});
	const { data: units = [] } = useQuery({
		queryKey: ["construction-units-all"],
		queryFn: () => api.get("/construction/units").then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (data: any) =>
			api.post("/construction/contracts-sales", data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			setOpen(false);
			toast.success("Договор создан");
			resetForm();
		},
		onError: () => toast.error("Ошибка создания договора"),
	});

	const statusMut = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) =>
			api
				.patch(`/construction/contracts-sales/${id}`, { status })
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-units"] });
			qc.invalidateQueries({ queryKey: ["construction-units-overview"] });
			toast.success("Статус обновлён");
		},
		onError: (err: unknown) => {
			toast.error(getApiErrorMessage(err, "Не удалось изменить статус"));
		},
	});

	const scheduleMut = useMutation({
		mutationFn: (id: number) =>
			api
				.post(`/construction/contracts-sales/${id}/generate-schedule`, {})
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
			toast.success("График платежей сформирован!");
		},
		onError: () => toast.error("Ошибка генерации графика"),
	});

	function resetForm() {
		setForm({
			projectId: "",
			unitId: "",
			unitIds: [],
			buyerName: "",
			buyerPhone: "",
			totalAmount: "",
			downPayment: "",
			installmentMonths: "12",
			currency: "KGS",
			exchangeRate: "1",
			contractDate: new Date().toISOString().slice(0, 10),
			notes: "",
			status: "draft",
		});
	}

	const remaining = Math.max(
		0,
		parseFloat(form.totalAmount || "0") - parseFloat(form.downPayment || "0"),
	);
	const monthly = form.installmentMonths
		? remaining / parseFloat(form.installmentMonths)
		: 0;
	const filteredUnits = form.projectId
		? units.filter(
				(u: any) =>
					u.projectId === Number(form.projectId) && u.status === "available",
			)
		: [];
	const selectedFormUnits = form.unitIds
		.map((id) => units.find((u: any) => String(u.id) === id))
		.filter(Boolean);
	const selectedUnitsTotal = selectedFormUnits.reduce((sum: number, u: any) => {
		const explicit = parseFloat(String(u.approvedTotalPrice || u.totalPrice || "0"));
		if (explicit > 0) return sum + explicit;
		const area = parseFloat(String(u.area || "0"));
		const pps = parseFloat(String(u.approvedSalePricePerSqm || u.pricePerSqm || "0"));
		return sum + (area > 0 && pps > 0 ? area * pps : 0);
	}, 0);
	const primaryContractProjectId = selectedFormUnits[0]?.projectId
		? Number(selectedFormUnits[0].projectId)
		: form.projectId
			? Number(form.projectId)
			: null;
	useEffect(() => {
		if (highlightFromUrl) {
			setDetailId(Number(highlightFromUrl));
		}
		if (statusFromUrl) {
			setStatusFilter(statusFromUrl);
		}
	}, [highlightFromUrl, statusFromUrl]);

	const filtered = useMemo(
		() =>
			contracts.filter(
				(c: any) => statusFilter === "all" || c.status === statusFilter,
			),
		[contracts, statusFilter],
	);

	const columns = useMemo<ColumnDef<any, unknown>[]>(
		() => [
			{
				id: "contractNumber",
				header: "№ договора",
				size: 120,
				accessorKey: "contractNumber",
				meta: { exportLabel: "№ договора", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-mono text-xs font-medium text-amber-600">
						{row.original.contractNumber}
					</span>
				),
			},
			{
				id: "buyer",
				header: "Покупатель",
				size: 180,
				accessorFn: (row: any) => row.buyerName || "",
				meta: { exportLabel: "Покупатель", pinned: "left" },
				cell: ({ row }) => (
					<div>
						<div className="font-medium text-gray-900">
							{row.original.buyerName || "—"}
						</div>
						{row.original.buyerPhone && (
							<div className="text-xs text-gray-600">
								{row.original.buyerPhone}
							</div>
						)}
					</div>
				),
			},
			{
				id: "portal",
				header: "Портал",
				size: 240,
				enableSorting: false,
				meta: { exportLabel: "Портал" },
				cell: ({ row }) => (
					<SalesContractPortalAccess
						contract={row.original}
						onRefresh={() => {
							qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
						}}
					/>
				),
			},
			{
				id: "project",
				header: "Проект",
				size: 140,
				accessorFn: (row: any) =>
					projects.find((p: any) => p.id === row.projectId)?.name || "—",
				meta: { exportLabel: "Проект" },
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => {
					return (
						<Status
							value={row.original.status}
							label={
								CONTRACT_STATUS_OPTIONS.find((o) => o.value === row.original.status)
									?.label
							}
							dot
						/>
					);
				},
			},
			{
				id: "totalAmount",
				header: "Сумма",
				size: 120,
				accessorFn: (row: any) => parseFloat(row.totalAmount || "0"),
				meta: { exportLabel: "Сумма", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						{fmt(row.original.totalAmount)} {row.original.currency}
					</span>
				),
			},
			{
				id: "paidAmount",
				header: "Оплачено",
				size: 130,
				accessorFn: (row: any) => parseFloat(row.paidAmount || "0"),
				meta: { exportLabel: "Оплачено", align: "right" },
				cell: ({ row }) => {
					const c = row.original;
					const pct =
						c.totalAmount > 0
							? Math.round(
									(parseFloat(c.paidAmount || "0") /
										parseFloat(c.totalAmount)) *
										100,
								)
							: 0;
					return (
						<div className="text-right">
							<div className="font-mono font-medium text-emerald-600">
								{fmt(c.paidAmount)}
							</div>
							<div className="w-16 ml-auto mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-emerald-400 rounded-full"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				},
			},
			{
				id: "remainingAmount",
				header: "Остаток",
				size: 110,
				accessorFn: (row: any) => parseFloat(row.remainingAmount || "0"),
				meta: { exportLabel: "Остаток", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-amber-600 font-medium">
						{fmt(row.original.remainingAmount)}
					</span>
				),
			},
			{
				accessorKey: "contractDate",
				header: "Дата",
				size: 100,
				meta: { exportLabel: "Дата" },
				cell: ({ row }) => (
					<span className="text-gray-600 text-xs">
						{row.original.contractDate}
					</span>
				),
			},
			{
				id: "__chevron",
				header: "",
				size: 40,
				enableSorting: false,
				cell: () => <ChevronRight className="w-4 h-4 text-gray-300" />,
			},
		],
		[projects, qc],
	);

	const totalContracts = contracts.length;
	const totalSold = contracts.filter(
		(c: any) => c.status === "signed" || c.status === "completed",
	).length;
	const totalAmount = contracts.reduce(
		(s: number, c: any) => s + parseFloat(c.totalAmount || "0"),
		0,
	);
	const totalPaid = contracts.reduce(
		(s: number, c: any) => s + parseFloat(c.paidAmount || "0"),
		0,
	);

	return (
		<PageShell.List
			title="Договоры продажи"
			subtitle="Воронка сделок и договоры ДКП"
			primaryAction={
				<Button
					onClick={() => setOpen(true)}
					className="bg-am-brand hover:bg-am-brand-hover text-white h-10"
				>
					<Plus className="w-4 h-4 mr-2" /> Новый договор
				</Button>
			}
			kpis={
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{
							label: "Всего договоров",
							value: totalContracts,
							color: "text-am-text-strong",
						},
						{ label: "Подписанных", value: totalSold, color: "text-am-success" },
						{
							label: "Сумма договоров",
							value: `${fmt(totalAmount)} сом`,
							color: "text-am-info",
						},
						{
							label: "Получено",
							value: `${fmt(totalPaid)} сом`,
							color: "text-am-brand",
						},
					].map((stat) => (
						<div
							key={stat.label}
							className="bg-am-bg rounded-lg p-4 border border-am-border shadow-sm"
						>
							<div className="text-xs text-am-text-muted mb-1">{stat.label}</div>
							<div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
						</div>
					))}
				</div>
			}
			filters={
				<div className="flex gap-2 flex-wrap">
					{[
						{ id: "all", label: "Все" },
						{ id: "review", label: "На утверждение" },
						{ id: "signed", label: "Подписан" },
						{ id: "draft", label: "Черновик" },
					].map((f) => (
						<button
							key={f.id}
							type="button"
							onClick={() => setStatusFilter(f.id)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
								statusFilter === f.id
									? "bg-am-brand text-white border-am-brand"
									: "bg-am-bg text-am-text border-am-border hover:bg-am-brand-surface"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>
			}
		>
			<Tablo maxHeight="calc(100vh - 320px)"
				title="Договоры ДКП"
				meta={`${filtered.length} записей`}
				tableId="construction-contracts-sales"
				columns={columns}
				data={filtered}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по покупателю или №..."
				initialSorting={[{ id: "contractDate", desc: true }]}
				onRowClick={(c: any) => setDetailId(c.id)}
				rowClassName={(c: any) => {
					const isHighlight =
						highlightFromUrl && Number(highlightFromUrl) === c.id;
					return `cursor-pointer hover:bg-am-brand-surface/50 ${
						isHighlight ? "bg-am-brand-surface ring-1 ring-am-brand" : ""
					}`;
				}}
				emptyState={
					<div className="flex flex-col items-center gap-2 py-8 text-am-text-muted">
						<FileText className="w-10 h-10 opacity-30" />
						<span>Нет договоров. Нажмите «Новый договор»</span>
					</div>
				}
			/>

			{/* Create Dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Новый договор продажи (ДКП)</DialogTitle>
						<DialogDescription className="sr-only">
							Форма создания договора купли-продажи
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 mt-2">
						<FormSection
							title="Помещения"
							description="Можно добавить несколько помещений из разных проектов. Каждое помещение проверяется по шахматке и должно быть доступно к продаже."
						>
							<Field label="Проект для выбора помещения" required className="col-span-6">
								<Select
									value={form.projectId}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, projectId: v, unitId: "" }))
									}
								>
									<SelectTrigger className="am-control w-full">
										<SelectValue placeholder="Выберите проект" />
									</SelectTrigger>
									<SelectContent>
										{projects.map((p: any) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field label="Добавить помещение из шахматки" className="col-span-6">
								<Select
									value={form.unitId}
									onValueChange={(v) =>
										setForm((f) => {
											if (v === "none") return { ...f, unitId: "" };
											const nextIds = f.unitIds.includes(v) ? f.unitIds : [...f.unitIds, v];
											const nextUnits = nextIds
												.map((id) => units.find((u: any) => String(u.id) === id))
												.filter(Boolean);
											const nextTotal = nextUnits.reduce((sum: number, u: any) => {
												const explicit = parseFloat(String(u.approvedTotalPrice || u.totalPrice || "0"));
												if (explicit > 0) return sum + explicit;
												const area = parseFloat(String(u.area || "0"));
												const pps = parseFloat(String(u.approvedSalePricePerSqm || u.pricePerSqm || "0"));
												return sum + (area > 0 && pps > 0 ? area * pps : 0);
											}, 0);
											return {
												...f,
												unitId: v,
												unitIds: nextIds,
												totalAmount: nextTotal > 0 ? String(Math.round(nextTotal)) : f.totalAmount,
											};
										})
									}
								>
									<SelectTrigger className="am-control w-full">
										<SelectValue placeholder="Из шахматки" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Не выбрано</SelectItem>
										{filteredUnits.map((u: any) => (
											<SelectItem key={u.id} value={String(u.id)}>
												Эт.{u.floor} №{u.unitNumber} ({u.area} м²)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedFormUnits.length > 0 && (
									<div className="mt-2 space-y-1.5">
										{selectedFormUnits.map((u: any, idx: number) => (
											<div
												key={u.id}
												className="flex items-center justify-between gap-2 rounded-lg border border-am-border bg-am-bg-subtle px-3 py-2 text-xs"
											>
												<span>
													{idx + 1}. {projects.find((p: any) => p.id === u.projectId)?.name || "Проект"} · блок {u.block || "—"} · эт.{u.floor || "—"} · №{u.unitNumber} · {u.area || "—"} м²
												</span>
												<button
													type="button"
													className="text-rose-600 hover:text-rose-700"
													onClick={() =>
														setForm((f) => {
															const nextIds = f.unitIds.filter((id) => id !== String(u.id));
															return {
																...f,
																unitIds: nextIds,
																unitId: nextIds[nextIds.length - 1] || "",
															};
														})
													}
												>
													Убрать
												</button>
											</div>
										))}
										{selectedUnitsTotal > 0 && (
											<p className="text-xs text-am-text-muted">
												Итого по выбранным помещениям: {fmt(selectedUnitsTotal)} {form.currency === "KGS" ? "сом" : form.currency}
											</p>
										)}
									</div>
								)}
							</Field>
						</FormSection>

						<FormSection title="Покупатель">
							<Field label="ФИО / название" required className="col-span-6">
								<Input
									value={form.buyerName}
									onChange={(e) =>
										setForm((f) => ({ ...f, buyerName: e.target.value }))
									}
									className="am-control w-full"
									placeholder="Иванов Иван Иванович"
								/>
							</Field>
							<Field label="Телефон" className="col-span-6">
								<Input
									value={form.buyerPhone}
									onChange={(e) =>
										setForm((f) => ({ ...f, buyerPhone: e.target.value }))
									}
									className="am-control w-full"
									placeholder="+996 555 123456"
								/>
							</Field>
						</FormSection>

						<FormSection
							title="Финансовые условия"
							description="Суммы в выбранной валюте. Минимальная сумма договора — по условиям проекта."
						>
							<Field
								label="Сумма договора"
								required
								help="Полная стоимость по договору ДКП"
								className="col-span-4"
							>
								<MoneyInput
									value={form.totalAmount}
									onChange={(v) => setForm((f) => ({ ...f, totalAmount: v }))}
									currency={form.currency}
									onCurrencyChange={(c) => setForm((f) => ({ ...f, currency: c }))}
								/>
							</Field>
							<Field
								label="Первоначальный взнос"
								help="Сумма, внесённая при подписании"
								className="col-span-4"
							>
								<MoneyInput
									value={form.downPayment}
									onChange={(v) => setForm((f) => ({ ...f, downPayment: v }))}
									currency={form.currency}
								/>
							</Field>
							<Field label="Рассрочка" helper="Срок в месяцах" className="col-span-4">
								<Input
									type="number"
									min={1}
									value={form.installmentMonths}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											installmentMonths: e.target.value,
										}))
									}
									className="am-control w-full"
									placeholder="12"
								/>
							</Field>
							{form.totalAmount && (
								<div className="col-span-12 bg-am-brand-surface border border-am-border rounded-lg px-4 py-3">
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 text-center text-sm">
										<div>
											<p className="text-xs text-am-text-muted">Остаток</p>
											<p className="font-semibold text-am-brand tabular-nums">
												{fmt(remaining)} {form.currency === "KGS" ? "сом" : form.currency}
											</p>
										</div>
										<div>
											<p className="text-xs text-am-text-muted">В месяц</p>
											<p className="font-semibold text-am-info tabular-nums">
												{fmt(monthly)} {form.currency === "KGS" ? "сом" : form.currency}
											</p>
										</div>
										<div>
											<p className="text-xs text-am-text-muted">Платежей</p>
											<p className="font-semibold text-am-text-strong">
												{form.installmentMonths || "—"}
											</p>
										</div>
									</div>
								</div>
							)}
						</FormSection>

						<FormGrid>
							<Field label="Дата договора" className="col-span-6">
								<Input
									type="date"
									value={form.contractDate}
									onChange={(e) =>
										setForm((f) => ({ ...f, contractDate: e.target.value }))
									}
									className="am-control w-full"
								/>
							</Field>
							<Field label="Статус" className="col-span-6">
								<Select
									value={form.status}
									onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
								>
									<SelectTrigger className="am-control w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CONTRACT_STATUS_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field label="Примечание" className="col-span-12">
								<Textarea
									value={form.notes}
									onChange={(e) =>
										setForm((f) => ({ ...f, notes: e.target.value }))
									}
									className="am-control min-h-[80px] w-full resize-none"
									rows={2}
								/>
							</Field>
						</FormGrid>

						<div className="flex gap-2 pt-2 border-t border-am-border">
							<Button
								variant="outline"
								className="flex-1 h-10"
								onClick={() => {
									setOpen(false);
									resetForm();
								}}
							>
								Отмена
							</Button>
							<Button
								className="flex-1 h-10 bg-am-brand hover:bg-am-brand-hover text-white"
								disabled={
									createMut.isPending ||
									!primaryContractProjectId ||
									selectedFormUnits.length === 0 ||
									!form.buyerName ||
									!form.totalAmount
								}
								onClick={() =>
									createMut.mutate({
										...form,
										projectId: primaryContractProjectId,
										unitId: form.unitIds[0]
											? Number(form.unitIds[0])
											: form.unitId && form.unitId !== "none"
												? Number(form.unitId)
												: null,
										unitIds: form.unitIds.map((id) => Number(id)),
										unitStatus: ["signed", "completed"].includes(form.status) ? "sold" : "reserved",
									})
								}
							>
								{createMut.isPending ? "Создание..." : "Создать договор"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Detail Dialog */}
			{detailId &&
				(() => {
					const contract = contracts.find((c: any) => c.id === detailId);
					if (!contract) return null;
					const proj = projects.find((p: any) => p.id === contract.projectId);
					return (
						<Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
							<DialogContent className="w-[calc(100vw-24px)] sm:w-[min(calc(100vw-48px),1440px)] lg:w-[min(calc(100vw-64px),1500px)] max-w-none max-h-[92vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2 flex-wrap">
										<span className="font-mono text-am-brand">
											{contract.contractNumber}
										</span>
										<Status
											value={contract.status}
											label={
												CONTRACT_STATUS_OPTIONS.find(
													(o) => o.value === contract.status,
												)?.label
											}
										/>
										{contract.status !== "terminated" && contract.status !== "cancelled" && (
											<Button
												size="sm"
												variant="outline"
												className="ml-auto text-rose-600 border-rose-200 hover:bg-rose-50"
												onClick={() => setTerminationContractId(contract.id)}
											>
												<XCircle className="w-3.5 h-3.5 mr-1" />
												Расторгнуть договор
											</Button>
										)}
									</DialogTitle>
									<DialogDescription className="sr-only">
										Карточка договора: сводка, этапы сделки и текст договора
									</DialogDescription>
								</DialogHeader>
								<Tabs defaultValue="summary">
									<TabsList>
										<TabsTrigger value="summary">Сводка</TabsTrigger>
										<TabsTrigger value="contract">Договор</TabsTrigger>
										<TabsTrigger value="documents">Документы</TabsTrigger>
									</TabsList>
									<TabsContent value="summary">
										<ContractDetailSummary
											contract={contract}
											proj={proj}
											statusMut={statusMut}
											scheduleMut={scheduleMut}
											hideReconciliation={isSalesOnly}
											onRefresh={() => {
												qc.invalidateQueries({
													queryKey: ["construction-contracts-sales"],
												});
												qc.invalidateQueries({
													queryKey: [
														"contract-sales-reconciliation",
														contract.id,
													],
												});
											}}
										/>
									</TabsContent>
									<TabsContent value="contract" className="mt-4">
										<ContractTab
											salesContractId={contract.id}
											projectId={contract.projectId}
										/>
									</TabsContent>
									<TabsContent value="documents" className="mt-4">
										<DocumentsSection
											entityType="construction_sales_contract"
											entityId={contract.id}
											showTaxInvoiceButton={true}
											taxInvoiceParams={{
												contractType: "construction_sales",
												contractId: contract.id,
												grossAmount: contract.totalAmount
													? parseFloat(String(contract.totalAmount))
													: undefined,
												currency: contract.currency ?? "KGS",
												buyerName: contract.buyerName ?? undefined,
												contractNumber: contract.contractNumber ?? undefined,
											}}
										/>
									</TabsContent>
								</Tabs>
							</DialogContent>
						</Dialog>
					);
				})()}

			{/* Contract Termination Dialog */}
			{terminationContractId && (
				<ContractTerminationDialog
					open={!!terminationContractId}
					onClose={() => setTerminationContractId(null)}
					contractType="sales"
					contractId={terminationContractId}
					contractLabel={
						contracts.find((c: any) => c.id === terminationContractId)
							?.contractNumber
					}
					onDone={() => {
						setTerminationContractId(null);
						setDetailId(null);
						qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
						qc.invalidateQueries({ queryKey: ["construction-units"] });
						qc.invalidateQueries({ queryKey: ["construction-units-overview"] });
					}}
				/>
			)}
		</PageShell.List>
	);
}
