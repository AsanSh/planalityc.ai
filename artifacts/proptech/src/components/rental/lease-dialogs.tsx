import { useQueryClient, useQuery } from "@tanstack/react-query";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
	Check,
	ChevronsUpDown,
	Info,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type CreateLeaseContractBodyStatus,
	getListDepositsQueryKey,
	getListLeaseContractsQueryKey,
	type LeaseContract,
	useCreateLeaseContract,
	useListDeposits,
	useListRentalProperties,
	useListTenants,
	useUpdateLeaseContract,
} from "@/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { authFetch } from "@/lib/auth-fetch";
import { pickDefaultRentalAccountId } from "@/lib/rental-currency";
import { getRentalAccountsQueryKey } from "@/lib/rental-query-keys";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

export const leaseStatusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800",
	active: "bg-emerald-100 text-emerald-800",
	expired: "bg-amber-100 text-amber-800",
	terminated: "bg-rose-100 text-rose-800",
};
export const leaseStatusLabels: Record<string, string> = {
	draft: "Черновик",
	active: "Активный",
	expired: "Истёк",
	terminated: "Расторгнут",
};

export function fmtLeaseAmount(amount: number | string, currency = "KGS") {
	const num = typeof amount === "string" ? parseFloat(amount) : amount;
	if (Number.isNaN(num)) return "—";
	try {
		return new Intl.NumberFormat("ru-KG", {
			style: "currency",
			currency,
		}).format(num);
	} catch {
		return `${num.toLocaleString("ru-KG")} ${currency}`;
	}
}

export function fmtLeaseDate(date: string | null | undefined) {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("ru-KG");
}

const MONTHS_RU = [
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

function computeProratePreview(
	startDate: string,
	endDate: string,
	rentAmount: number,
): {
	firstMonth: { label: string; amount: number; isProrated: boolean } | null;
	lastMonth: { label: string; amount: number; isProrated: boolean } | null;
} | null {
	if (!startDate || Number.isNaN(rentAmount) || rentAmount <= 0) return null;
	const start = new Date(startDate);
	if (Number.isNaN(start.getTime())) return null;

	const firstDim = new Date(
		start.getFullYear(),
		start.getMonth() + 1,
		0,
	).getDate();
	const firstDay = start.getDate();
	const firstIsProrated = firstDay > 1;
	const firstAmount = firstIsProrated
		? Math.round((rentAmount / firstDim) * (firstDim - firstDay + 1) * 100) /
			100
		: rentAmount;
	const firstLabel = `${MONTHS_RU[start.getMonth()]} ${start.getFullYear()}`;

	let lastMonthResult: {
		label: string;
		amount: number;
		isProrated: boolean;
	} | null = null;
	if (endDate) {
		const end = new Date(endDate);
		if (!Number.isNaN(end.getTime())) {
			const lastDim = new Date(
				end.getFullYear(),
				end.getMonth() + 1,
				0,
			).getDate();
			const lastDay = end.getDate();
			const isSameMonth =
				start.getFullYear() === end.getFullYear() &&
				start.getMonth() === end.getMonth();
			const lastIsProrated = !isSameMonth && lastDay < lastDim;
			const lastAmount = isSameMonth
				? Math.round((rentAmount / lastDim) * (lastDay - firstDay + 1) * 100) /
					100
				: lastIsProrated
					? Math.round((rentAmount / lastDim) * lastDay * 100) / 100
					: rentAmount;
			const lastLabel = `${MONTHS_RU[end.getMonth()]} ${end.getFullYear()}`;
			if (lastIsProrated || isSameMonth) {
				lastMonthResult = {
					label: lastLabel,
					amount: lastAmount,
					isProrated: true,
				};
			}
		}
	}

	return {
		firstMonth: {
			label: firstLabel,
			amount: firstAmount,
			isProrated: firstIsProrated,
		},
		lastMonth: lastMonthResult,
	};
}

// ── ProrationPreview ──────────────────────────────────────────────────────────

function ProrationPreview({
	startDate,
	endDate,
	rentAmount,
	currency,
}: {
	startDate: string;
	endDate: string;
	rentAmount: string;
	currency: string;
}) {
	const amount = parseFloat(rentAmount);
	const preview = useMemo(
		() => computeProratePreview(startDate, endDate, amount),
		[startDate, endDate, amount],
	);
	if (!preview) return null;
	const { firstMonth, lastMonth } = preview;
	if (!firstMonth?.isProrated && !lastMonth?.isProrated) return null;

	return (
		<Alert className="border-blue-200 bg-blue-50 text-blue-900 text-sm">
			<Info className="h-4 w-4 text-blue-600" />
			<AlertDescription className="space-y-1">
				<div className="font-semibold text-blue-800 mb-1">
					Пропорциональный расчёт
				</div>
				{firstMonth?.isProrated && (
					<div>
						<span className="text-blue-600">{firstMonth.label}:</span>{" "}
						<span className="font-semibold">
							{fmtLeaseAmount(firstMonth.amount, currency)}
						</span>{" "}
						<span className="text-blue-500">
							(с {new Date(startDate).toLocaleDateString("ru-KG")} до конца
							месяца)
						</span>
					</div>
				)}
				{lastMonth?.isProrated && (
					<div>
						<span className="text-blue-600">{lastMonth.label}:</span>{" "}
						<span className="font-semibold">
							{fmtLeaseAmount(lastMonth.amount, currency)}
						</span>{" "}
						<span className="text-blue-500">
							(до {new Date(endDate).toLocaleDateString("ru-KG")})
						</span>
					</div>
				)}
				<div className="text-blue-500 text-xs mt-1">
					Остальные месяцы — {fmtLeaseAmount(amount, currency)}
				</div>
			</AlertDescription>
		</Alert>
	);
}

// ── FormState ────────────────────────────────────────────────────────────────

type FormState = {
	propertyId: string;
	tenantId: string;
	contractNumber: string;
	signDate: string;
	startDate: string;
	endDate: string;
	rentAmount: string;
	currency: string;
	depositAmount: string;
	depositAccountId: string;
	accrualDay: string;
	status: CreateLeaseContractBodyStatus;
	comment: string;
};

const EMPTY_FORM: FormState = {
	propertyId: "",
	tenantId: "",
	contractNumber: "",
	signDate: "",
	startDate: "",
	endDate: "",
	rentAmount: "",
	currency: "KGS",
	depositAmount: "",
	depositAccountId: "",
	accrualDay: "1",
	status: "active",
	comment: "",
};

type RentalPropertyOption = {
	id: number;
	projectName: string;
	unitNumber: string;
	rentalStatus?: string;
	block?: string | null;
};

function formatPropertyLabel(
	p: RentalPropertyOption,
	mode: "create" | "edit",
): string {
	const base = `${p.projectName} ${p.unitNumber}`;
	if (mode === "create" && p.rentalStatus !== "free") {
		return `${base} · занят`;
	}
	return base;
}

function propertySearchText(p: RentalPropertyOption): string {
	return [p.unitNumber, p.projectName, p.block]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function tenantSearchText(t: {
	fullName: string;
	phone?: string | null;
	iin?: string | null;
}): string {
	return [t.fullName, t.phone, t.iin].filter(Boolean).join(" ").toLowerCase();
}

function SearchableCombobox<T extends { id: number }>({
	value,
	onValueChange,
	options,
	getLabel,
	getSearchText,
	placeholder,
	searchPlaceholder,
	disabled,
}: {
	value: string;
	onValueChange: (v: string) => void;
	options: T[];
	getLabel: (item: T) => string;
	getSearchText: (item: T) => string;
	placeholder: string;
	searchPlaceholder: string;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return options;
		return options.filter((item) => getSearchText(item).includes(q));
	}, [options, search, getSearchText]);

	const selectedLabel = useMemo(() => {
		if (!value) return placeholder;
		const item = options.find((x) => String(x.id) === value);
		return item ? getLabel(item) : placeholder;
	}, [value, options, getLabel, placeholder]);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setSearch("");
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-full justify-between font-normal mt-auto",
						!value && "text-muted-foreground",
					)}
				>
					<span className="truncate">{selectedLabel}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={searchPlaceholder}
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>Ничего не найдено</CommandEmpty>
						{filtered.map((item) => (
							<CommandItem
								key={item.id}
								value={String(item.id)}
								onSelect={() => {
									onValueChange(String(item.id));
									setOpen(false);
									setSearch("");
								}}
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										value === String(item.id) ? "opacity-100" : "opacity-0",
									)}
								/>
								{getLabel(item)}
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// ── Shared form fields ────────────────────────────────────────────────────────

function depositAmountNumber(value: string): number {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

function LeaseFormFields({
	form,
	setForm,
	mode,
}: {
	form: FormState;
	setForm: React.Dispatch<React.SetStateAction<FormState>>;
	mode: "create" | "edit";
}) {
	const { data: tenants } = useListTenants();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const { data: properties } = useListRentalProperties();
	const propertiesArray = Array.isArray(properties) ? properties : [];
	const { data: accounts = [] } = useQuery<any[]>({
		queryKey: getRentalAccountsQueryKey(),
		queryFn: () => api.get("/rental/accounts").then((r) => r.data),
	});
	const accountsArray = useMemo(
		() => (Array.isArray(accounts) ? accounts : []),
		[accounts],
	);
	const depositRequired =
		form.depositAmount.trim() !== "" && parseFloat(form.depositAmount) > 0;

	useEffect(() => {
		if (!depositRequired || accountsArray.length === 0) return;
		setForm((prev) => {
			const defaultId = pickDefaultRentalAccountId(accountsArray, prev.currency);
			if (!defaultId || defaultId === prev.depositAccountId) return prev;
			if (prev.depositAccountId) {
				const current = accountsArray.find(
					(a: { id: number; currency?: string | null }) =>
						String(a.id) === prev.depositAccountId,
				);
				if (
					current &&
					(current.currency || "KGS").toUpperCase() === prev.currency.toUpperCase()
				) {
					return prev;
				}
			}
			return { ...prev, depositAccountId: defaultId };
		});
	}, [depositRequired, form.currency, accountsArray]);

	// Показываем все объекты; свободные — первыми, занятые — с пометкой.
	const availableProperties =
		mode === "create"
			? [...propertiesArray].sort(
					(a, b) =>
						(a.rentalStatus === "free" ? 0 : 1) - (b.rentalStatus === "free" ? 0 : 1),
				)
			: propertiesArray;

	const f =
		(field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
			setForm({ ...form, [field]: e.target.value });

	return (
		<div className="space-y-3">
			{/* Объект и Арендатор */}
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col">
					<Label className="leading-tight mb-1.5">Объект {mode === "create" && "*"}</Label>
					<SearchableCombobox
						value={form.propertyId}
						onValueChange={(v) => setForm({ ...form, propertyId: v })}
						options={availableProperties}
						getLabel={(p) => formatPropertyLabel(p, mode)}
						getSearchText={propertySearchText}
						placeholder="Выберите объект"
						searchPlaceholder="Номер, адрес, блок..."
						disabled={mode === "edit"}
					/>
				</div>
				<div className="flex flex-col">
					<Label className="leading-tight mb-1.5">Арендатор {mode === "create" && "*"}</Label>
					<SearchableCombobox
						value={form.tenantId}
						onValueChange={(v) => setForm({ ...form, tenantId: v })}
						options={tenantsArray}
						getLabel={(t) => t.fullName}
						getSearchText={tenantSearchText}
						placeholder="Выберите арендатора"
						searchPlaceholder="ФИО, телефон, ИИН..."
						disabled={mode === "edit"}
					/>
				</div>
			</div>

			{/* Номер договора */}
			<div>
				<Label>Номер договора *</Label>
				<Input
					value={form.contractNumber}
					onChange={f("contractNumber")}
					placeholder="ДА-2026-001"
					required
				/>
			</div>

			{/* Три ключевые даты */}
			<div className="border rounded-lg p-3 space-y-2 bg-muted/30">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
					Даты договора
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="flex flex-col">
						<Label className="text-sm leading-tight mb-1.5">
							Начало начислений <span className="text-destructive">*</span>
						</Label>
						<Input
							type="date"
							value={form.startDate}
							onChange={f("startDate")}
							required
							className="mt-auto"
						/>
					</div>
					<div className="flex flex-col">
						<Label className="text-sm text-muted-foreground leading-tight mb-1.5">
							Завершение договора
						</Label>
						<Input
							type="date"
							value={form.endDate}
							onChange={f("endDate")}
							className="mt-auto"
						/>
					</div>
				</div>
				<div className="w-1/2 pr-1.5">
					<Label className="text-sm text-muted-foreground">
						Дата подписания
					</Label>
					<Input
						type="date"
						value={form.signDate}
						onChange={f("signDate")}
						className="mt-1"
					/>
				</div>
			</div>

			{/* Сумма */}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<div className="col-span-2 flex flex-col">
					<Label className="leading-tight mb-1.5">Сумма аренды в месяц *</Label>
					<Input
						className="mt-auto"
						type="number"
						value={form.rentAmount}
						onChange={f("rentAmount")}
						placeholder="150 000"
						required
						min={0}
					/>
				</div>
				<div className="flex flex-col">
					<Label className="leading-tight mb-1.5">Валюта</Label>
					<Select
						value={form.currency}
						onValueChange={(v) => setForm({ ...form, currency: v })}
					>
						<SelectTrigger className="mt-auto">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="KGS">Сом (KGS)</SelectItem>
							<SelectItem value="USD">Доллар (USD)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Превью пропорции */}
			<ProrationPreview
				startDate={form.startDate}
				endDate={form.endDate}
				rentAmount={form.rentAmount}
				currency={form.currency}
			/>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col">
					<Label className="leading-tight mb-1.5">Депозит</Label>
					<Input
						className="mt-auto"
						type="number"
						value={form.depositAmount}
						onChange={f("depositAmount")}
						placeholder="300 000"
						min={0}
					/>
				</div>
				<div className="flex flex-col">
					<Label className="leading-tight mb-1.5">
						День начисления
						<span className="text-muted-foreground text-xs ml-1">(1–31)</span>
					</Label>
					<Input
						className="mt-auto"
						type="number"
						min={1}
						max={31}
						value={form.accrualDay}
						onChange={f("accrualDay")}
					/>
				</div>
			</div>

			{depositRequired && (
				<div>
					<Label>Счёт для депозита *</Label>
					<Select
						value={form.depositAccountId}
						onValueChange={(v) => setForm({ ...form, depositAccountId: v })}
						required
					>
						<SelectTrigger className="mt-1">
							<SelectValue placeholder="Выберите счёт" />
						</SelectTrigger>
						<SelectContent>
							{accountsArray.length === 0 ? (
								<SelectItem value="_empty" disabled>
									Сначала создайте счёт в разделе «Расчётные счета»
								</SelectItem>
							) : (
								accountsArray.map((a: { id: number; name: string; currency?: string }) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.name}
										{(a.currency || "KGS").toUpperCase() !== form.currency.toUpperCase()
											? ` (${a.currency || "KGS"})`
											: ""}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground mt-1">
						Депозит будет привязан к выбранному расчётному счёту
					</p>
				</div>
			)}

			<div>
				<Label>Статус</Label>
				<Select
					value={form.status}
					onValueChange={(v) =>
						setForm({ ...form, status: v as CreateLeaseContractBodyStatus })
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="draft">Черновик</SelectItem>
						<SelectItem value="active">Активный</SelectItem>
						<SelectItem value="expired">Истёк</SelectItem>
						<SelectItem value="terminated">Расторгнут</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label>Комментарий</Label>
				<Input
					value={form.comment}
					onChange={f("comment")}
					placeholder="Дополнительные условия..."
				/>
			</div>
		</div>
	);
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function generateContractNumber(): string {
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = String(now.getFullYear());
	const rnd = String(Math.floor(10 + Math.random() * 90));
	return `ДА-${dd}${mm}${yyyy}-${rnd}`;
}

export function CreateLeaseDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const createMutation = useCreateLeaseContract();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [form, setForm] = useState<FormState>(() => ({
		...EMPTY_FORM,
		contractNumber: generateContractNumber(),
	}));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (depositAmountNumber(form.depositAmount) > 0 && !form.depositAccountId) {
			toast({
				title: "Выберите счёт для депозита",
				description: "При указании суммы депозита нужно выбрать расчётный счёт",
				variant: "destructive",
			});
			return;
		}
		try {
			await createMutation.mutateAsync({
				data: {
					propertyId: parseInt(form.propertyId, 10),
					tenantId: parseInt(form.tenantId, 10),
					contractNumber: form.contractNumber,
					signDate: form.signDate || null,
					startDate: form.startDate,
					endDate: form.endDate || null,
					rentAmount: parseFloat(form.rentAmount),
					currency: form.currency,
					depositAmount: form.depositAmount
						? parseFloat(form.depositAmount)
						: null,
					depositAccountId: form.depositAccountId
						? parseInt(form.depositAccountId, 10)
						: null,
					accrualDay: form.accrualDay ? parseInt(form.accrualDay, 10) : null,
					status: form.status,
					comment: form.comment || null,
				} as Parameters<typeof createMutation.mutateAsync>[0]["data"],
			});
			toast({ title: "Договор аренды создан" });
			queryClient.invalidateQueries({
				queryKey: getListLeaseContractsQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: getListDepositsQueryKey(),
			});
			setForm({ ...EMPTY_FORM, contractNumber: generateContractNumber() });
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message || "Не удалось создать договор",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Новый договор аренды</DialogTitle>
					<DialogDescription>
						Если дата начала начисления не 1-е число, первый месяц
						рассчитывается пропорционально.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<LeaseFormFields form={form} setForm={setForm} mode="create" />
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Создание..." : "Создать договор"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

export function EditLeaseDialog({
	lease,
	open,
	onClose,
}: {
	lease: LeaseContract;
	open: boolean;
	onClose: () => void;
}) {
	const updateMutation = useUpdateLeaseContract();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const { data: deposits } = useListDeposits();
	const depositsArray = useMemo(
		() => (Array.isArray(deposits) ? deposits : []),
		[deposits],
	);
	const [recalcConfirm, setRecalcConfirm] = useState(false);
	const [recalcLoading, setRecalcLoading] = useState(false);

	const leaseDepositAccountId = useMemo(() => {
		const held = depositsArray.find(
			(d) => Number(d.leaseContractId) === Number(lease.id) && d.status === "held",
		) as (typeof depositsArray)[number] & { accountId?: number | null };
		return held?.accountId ? String(held.accountId) : "";
	}, [depositsArray, lease.id]);

	const buildFormFromLease = useCallback((): FormState => ({
		propertyId: String(lease.propertyId),
		tenantId: String(lease.tenantId),
		contractNumber: lease.contractNumber,
		signDate: lease.signDate ?? "",
		startDate: lease.startDate,
		endDate: lease.endDate ?? "",
		rentAmount: String(lease.rentAmount),
		currency: lease.currency,
		depositAmount: lease.depositAmount ? String(lease.depositAmount) : "",
		depositAccountId: leaseDepositAccountId,
		accrualDay: lease.accrualDay ? String(lease.accrualDay) : "1",
		status: lease.status as CreateLeaseContractBodyStatus,
		comment: lease.comment ?? "",
	}), [lease, leaseDepositAccountId]);

	const [form, setForm] = useState<FormState>(buildFormFromLease);

	useEffect(() => {
		if (!open) return;
		setForm(buildFormFromLease());
	}, [open, buildFormFromLease]);

	const keyFieldsChanged =
		form.startDate !== lease.startDate ||
		form.endDate !== (lease.endDate ?? "") ||
		form.rentAmount !== String(lease.rentAmount) ||
		form.accrualDay !== String(lease.accrualDay ?? 1);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (depositAmountNumber(form.depositAmount) > 0 && !form.depositAccountId) {
			toast({
				title: "Выберите счёт для депозита",
				description: "При указании суммы депозита нужно выбрать расчётный счёт",
				variant: "destructive",
			});
			return;
		}
		try {
			await updateMutation.mutateAsync({
				id: lease.id,
				data: {
					signDate: form.signDate || null,
					startDate: form.startDate,
					endDate: form.endDate || null,
					rentAmount: parseFloat(form.rentAmount),
					currency: form.currency,
					depositAmount: form.depositAmount
						? parseFloat(form.depositAmount)
						: null,
					depositAccountId: form.depositAccountId
						? parseInt(form.depositAccountId, 10)
						: null,
					accrualDay: form.accrualDay ? parseInt(form.accrualDay, 10) : null,
					status: form.status,
					comment: form.comment || null,
				} as Parameters<typeof updateMutation.mutateAsync>[0]["data"],
			});
			toast({ title: "Договор обновлён" });
			queryClient.invalidateQueries({
				queryKey: getListLeaseContractsQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: getListDepositsQueryKey(),
			});

			if (keyFieldsChanged) {
				setRecalcConfirm(true);
			} else {
				onClose();
			}
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message || "Не удалось обновить договор",
				variant: "destructive",
			});
		}
	};

	const handleRecalculate = async () => {
		setRecalcLoading(true);
		try {
			const res = await authFetch(`/rental/accruals/recalculate`, {
				method: "POST",
				body: JSON.stringify({ leaseContractId: lease.id }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка пересчёта");
			}
			const data = await res.json();
			toast({
				title: "Начисления пересчитаны",
				description: `Добавлено ${data.inserted} начислений`,
			});
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message,
				variant: "destructive",
			});
		} finally {
			setRecalcLoading(false);
			setRecalcConfirm(false);
			onClose();
		}
	};

	if (recalcConfirm) {
		return (
			<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Пересчитать начисления?</DialogTitle>
						<DialogDescription>
							Условия договора изменились. Хотите пересчитать будущие начисления
							с учётом пропорционального расчёта первого месяца?
							<br />
							<span className="text-amber-600 font-medium">
								Оплаченные начисления сохранятся.
							</span>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2">
						<Button
							variant="outline"
							onClick={onClose}
							disabled={recalcLoading}
						>
							Не пересчитывать
						</Button>
						<Button onClick={handleRecalculate} disabled={recalcLoading}>
							{recalcLoading ? "Пересчёт..." : "Пересчитать начисления"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Редактировать договор</DialogTitle>
					<DialogDescription>
						Договор <strong>{lease.contractNumber}</strong>. При изменении
						ставки или дат — предложим пересчитать начисления.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<LeaseFormFields form={form} setForm={setForm} mode="edit" />
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending
								? "Сохранение..."
								: "Сохранить изменения"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Recalculate dialog ────────────────────────────────────────────────────────

export function RecalcDialog({
	lease,
	open,
	onClose,
}: {
	lease: LeaseContract;
	open: boolean;
	onClose: () => void;
}) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const handleRecalculate = async () => {
		setLoading(true);
		try {
			const res = await authFetch(`/rental/accruals/recalculate`, {
				method: "POST",
				body: JSON.stringify({ leaseContractId: lease.id }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка пересчёта");
			}
			const data = await res.json();
			toast({
				title: "Начисления пересчитаны",
				description: `Добавлено ${data.inserted} новых начислений.`,
			});
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err?.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Пересчитать начисления</DialogTitle>
					<DialogDescription>
						Договор <strong>{lease.contractNumber}</strong>. Будут пересозданы
						неоплаченные начисления с пропорциональным расчётом первого и
						последнего месяца.
						<br />
						<span className="text-amber-600 font-medium">
							Оплаченные начисления не затронуты.
						</span>
					</DialogDescription>
				</DialogHeader>
				<div className="py-2 text-sm text-muted-foreground space-y-1">
					{lease.signDate && (
						<div>
							Дата подписания: <strong>{fmtLeaseDate(lease.signDate)}</strong>
						</div>
					)}
					<div>
						Дата начала начисления: <strong>{fmtLeaseDate(lease.startDate)}</strong>
					</div>
					{lease.endDate && (
						<div>
							Дата завершения: <strong>{fmtLeaseDate(lease.endDate)}</strong>
						</div>
					)}
					<div>
						Ставка аренды:{" "}
						<strong>{fmtLeaseAmount(lease.rentAmount, lease.currency)}</strong>/мес.
					</div>
				</div>
				<DialogFooter className="flex gap-2">
					<Button variant="outline" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button onClick={handleRecalculate} disabled={loading}>
						<RefreshCw className="w-4 h-4 mr-2" />
						{loading ? "Пересчёт..." : "Пересчитать"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Terminate dialog ──────────────────────────────────────────────────────────

export function TerminateLeaseDialog({
	lease,
	open,
	onClose,
	onDone,
}: {
	lease: LeaseContract | null;
	open: boolean;
	onClose: () => void;
	onDone: () => void;
}) {
	const { toast } = useToast();
	const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split("T")[0]);
	const [reason, setReason] = useState("");
	const [loading, setLoading] = useState(false);

	if (!lease) return null;

	const handleTerminate = async () => {
		if (
			!(await confirmDialog(
				`Расторгнуть договор ${lease.contractNumber}?\n\nОбъект освободится, будущие начисления отменятся. История платежей сохранится.`,
				{ destructive: true },
			))
		) {
			return;
		}
		setLoading(true);
		try {
			await api.post(`/rental/contracts/${lease.id}/terminate`, {
				terminationDate,
				reason: reason.trim() || null,
			});
			toast({ title: "Договор расторгнут", description: lease.contractNumber });
			onDone();
			onClose();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? getApiErrorMessage(e)
					: null;
			toast({
				title: "Ошибка",
				description: msg || "Не удалось расторгнуть договор",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Расторжение договора</DialogTitle>
					<DialogDescription>
						{lease.contractNumber} · {(lease as any).tenantName || `#${lease.tenantId}`}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Дата расторжения *</Label>
						<Input
							type="date"
							className="mt-1"
							value={terminationDate}
							onChange={(e) => setTerminationDate(e.target.value)}
						/>
					</div>
					<div>
						<Label>Причина / комментарий</Label>
						<Textarea
							className="mt-1 resize-none"
							rows={2}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="По соглашению сторон, досрочный выезд..."
						/>
					</div>
					<p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
						Начисления после даты расторжения будут отменены. Непогашенный долг останется в начислениях.
					</p>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onClose} disabled={loading}>Отмена</Button>
					<Button className="bg-rose-600 hover:bg-rose-700" onClick={handleTerminate} disabled={loading}>
						{loading ? "Расторжение..." : "Расторгнуть"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}