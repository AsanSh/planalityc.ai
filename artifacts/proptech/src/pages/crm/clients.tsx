import { CalendarDays, CreditCard, Edit2, FileSignature, Mail, Phone, Plus, Target, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface Client {
	id: number;
	fullName: string;
	type: "individual" | "company";
	phone: string;
	email?: string;
	address?: string;
	inn?: string;
	passportData?: string;
	birthDate?: string;
	budget?: number;
	creditApproved: boolean;
	notes?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface ClientDeal {
	id: number;
	dealAmount: string | number;
	currency: string;
	stage: string;
	probability?: number | null;
	expectedCloseDate?: string | null;
	notes?: string | null;
	createdAt: string;
}

interface ClientContract {
	id: number;
	contractNumber: string;
	totalAmount: string | number;
	currency: string;
	status: string;
	signDate?: string | null;
	registrationDate?: string | null;
	createdAt: string;
}

type ClientDetails = Client & {
	deals?: ClientDeal[];
	contracts?: ClientContract[];
};

const TYPE_OPTIONS = [
	{ value: "individual", label: "Физическое лицо" },
	{ value: "company", label: "Юридическое лицо" },
];

const STATUS_OPTIONS = [
	{
		value: "active",
		label: "Активный",
		color: "bg-emerald-100 text-emerald-800",
	},
	{
		value: "inactive",
		label: "Неактивный",
		color: "bg-gray-100 text-gray-800",
	},
];

const DEAL_STAGE_LABELS: Record<string, string> = {
	lead: "Лид",
	viewing: "Показ",
	negotiation: "Переговоры",
	contract: "Договор",
	closed_won: "Успешно",
	closed_lost: "Отказ",
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	signed: "Подписан",
	registered: "Зарегистрирован",
	cancelled: "Отменён",
};

function formatDate(value?: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("ru-RU");
}

interface ClientDialogProps {
	open: boolean;
	onClose: () => void;
	client?: Client;
	onSuccess: () => void;
}

function ClientDialog({ open, onClose, client, onSuccess }: ClientDialogProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		fullName: "",
		type: "individual" as "individual" | "company",
		phone: "",
		email: "",
		address: "",
		inn: "",
		passportData: "",
		birthDate: "",
		budget: "",
		creditApproved: false,
		notes: "",
		status: "active",
	});

	useEffect(() => {
		if (client && open) {
			setFormData({
				fullName: client.fullName || "",
				type: client.type || "individual",
				phone: client.phone || "",
				email: client.email || "",
				address: client.address || "",
				inn: client.inn || "",
				passportData: client.passportData || "",
				birthDate: client.birthDate ? client.birthDate.split("T")[0] : "",
				budget: client.budget ? String(client.budget) : "",
				creditApproved: client.creditApproved || false,
				notes: client.notes || "",
				status: client.status || "active",
			});
		} else if (!client && open) {
			setFormData({
				fullName: "",
				type: "individual",
				phone: "",
				email: "",
				address: "",
				inn: "",
				passportData: "",
				birthDate: "",
				budget: "",
				creditApproved: false,
				notes: "",
				status: "active",
			});
		}
	}, [client, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const payload = {
				fullName: formData.fullName,
				type: formData.type,
				phone: formData.phone,
				email: formData.email || null,
				address: formData.address || null,
				inn: formData.inn || null,
				passportData: formData.passportData || null,
				birthDate: formData.birthDate || null,
				budget: formData.budget ? parseFloat(formData.budget) : null,
				creditApproved: formData.creditApproved,
				notes: formData.notes || null,
				status: formData.status,
			};

			if (client) {
				await api.patch(`/crm/clients/${client.id}`, payload);
				toast({ title: "Клиент обновлён" });
			} else {
				await api.post("/crm/clients", payload);
				toast({ title: "Клиент создан" });
			}
			onSuccess();
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось сохранить клиента",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{client ? "Редактировать клиента" : "Создать клиента"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип *</Label>
							<Select
								value={formData.type}
								onValueChange={(v: "individual" | "company") =>
									setFormData({ ...formData, type: v })
								}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус *</Label>
							<Select
								value={formData.status}
								onValueChange={(v) => setFormData({ ...formData, status: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>
							{formData.type === "company"
								? "Наименование организации *"
								: "ФИО *"}
						</Label>
						<Input
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							placeholder={
								formData.type === "company"
									? 'ОсОО "Компания"'
									: "Иванов Иван Иванович"
							}
							required
							className="mt-1"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Телефон *</Label>
							<Input
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								placeholder="+996 700 000 000"
								required
								className="mt-auto"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Email</Label>
							<Input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="example@mail.kg"
								className="mt-auto"
							/>
						</div>
					</div>

					<div>
						<Label>Адрес</Label>
						<Input
							value={formData.address}
							onChange={(e) =>
								setFormData({ ...formData, address: e.target.value })
							}
							placeholder="г. Бишкек, ул..."
							className="mt-1"
						/>
					</div>

					{formData.type === "individual" ? (
						<div className="grid gap-3 sm:grid-cols-2">
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Паспортные данные</Label>
									<Input
										value={formData.passportData}
										onChange={(e) =>
											setFormData({ ...formData, passportData: e.target.value })
										}
										placeholder="ID 1234567"
										className="mt-auto"
									/>
								</div>
								<div className="flex flex-col">
									<Label className="leading-tight mb-1.5">Дата рождения</Label>
									<Input
										type="date"
										value={formData.birthDate}
										onChange={(e) =>
											setFormData({ ...formData, birthDate: e.target.value })
										}
										className="mt-auto"
									/>
								</div>
							</div>
					) : (
						<div>
							<Label>ИНН</Label>
							<Input
								value={formData.inn}
								onChange={(e) =>
									setFormData({ ...formData, inn: e.target.value })
								}
								placeholder="01234567890123"
								className="mt-1"
							/>
						</div>
					)}

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Бюджет (KGS)</Label>
							<Input
								type="number"
								value={formData.budget}
								onChange={(e) =>
									setFormData({ ...formData, budget: e.target.value })
								}
								placeholder="10000000"
								className="mt-auto"
							/>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								id="creditApproved"
								checked={formData.creditApproved}
								onChange={(e) =>
									setFormData({ ...formData, creditApproved: e.target.checked })
								}
								className="w-4 h-4"
							/>
							<Label htmlFor="creditApproved" className="cursor-pointer">
								Кредит одобрен
							</Label>
						</div>
					</div>

					<div>
						<Label>Заметки</Label>
						<Textarea
							value={formData.notes}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							placeholder="Дополнительная информация"
							rows={3}
							className="mt-1"
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ClientRecordSheet({
	client,
	open,
	onOpenChange,
	onEdit,
	refreshKey,
}: {
	client?: Client;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit: (client: Client) => void;
	refreshKey: number;
}) {
	const { toast } = useToast();
	const [details, setDetails] = useState<ClientDetails | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!open || !client?.id) {
			setDetails(null);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		api
			.get<ClientDetails>(`/crm/clients/${client.id}`)
			.then((response) => {
				if (!cancelled) setDetails(response.data);
			})
			.catch((err: any) => {
				if (cancelled) return;
				toast({
					title: "Не удалось открыть карточку",
					description: err.message || "Проверьте данные клиента",
					variant: "destructive",
				});
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [client?.id, open, refreshKey, toast]);

	const record = details ?? client;
	const deals = details?.deals ?? [];
	const contracts = details?.contracts ?? [];
	const events = [
		...(record?.createdAt
			? [{ date: record.createdAt, title: "Клиент создан", meta: record.fullName }]
			: []),
		...deals.map((deal) => ({
			date: deal.createdAt,
			title: `Сделка: ${DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}`,
			meta: formatCurrency(deal.dealAmount, deal.currency),
		})),
		...contracts.map((contract) => ({
			date: contract.signDate ?? contract.createdAt,
			title: `Договор ${contract.contractNumber}`,
			meta: CONTRACT_STATUS_LABELS[contract.status] ?? contract.status,
		})),
	].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
				<SheetHeader className="border-b border-slate-200 p-5">
					<SheetTitle className="pr-8 text-left">
						<span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">
							Карточка клиента 360
						</span>
						<span className="mt-1 block text-2xl font-bold text-slate-950">
							{record?.fullName ?? "Клиент"}
						</span>
					</SheetTitle>
					<p className="text-left text-sm text-slate-500">
						Связи клиента с контактами, сделками, договорами и историей продаж.
					</p>
				</SheetHeader>

				{isLoading ? (
					<div className="p-5 text-sm text-slate-500">Загрузка карточки...</div>
				) : record ? (
					<div className="space-y-5 p-5">
						<div className="rounded-[22px] border border-cyan-100 bg-cyan-50/60 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										{TYPE_OPTIONS.find((item) => item.value === record.type)?.label ?? record.type}
										{getClientStatusBadge(record.status)}
									</div>
									<div className="mt-3 grid gap-2 text-sm text-slate-700">
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-cyan-700" />
											<span>{record.phone || "Телефон не указан"}</span>
										</div>
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-cyan-700" />
											<span>{record.email || "Email не указан"}</span>
										</div>
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => onEdit(record)}
									className="shrink-0"
								>
									<Edit2 className="mr-1.5 h-4 w-4" />
									Изменить
								</Button>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-[18px] border border-slate-200 bg-white p-4">
								<div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
									<CreditCard className="h-4 w-4 text-emerald-600" />
									Бюджет
								</div>
								<div className="mt-2 text-xl font-bold text-slate-950">
									{record.budget ? formatCurrency(record.budget, "KGS") : "—"}
								</div>
							</div>
							<div className="rounded-[18px] border border-slate-200 bg-white p-4">
								<div className="text-sm font-semibold text-slate-500">Кредит</div>
								<div className={cn("mt-2 text-xl font-bold", record.creditApproved ? "text-emerald-700" : "text-slate-400")}>
									{record.creditApproved ? "Одобрен" : "Не указан"}
								</div>
							</div>
						</div>

						<section className="rounded-[22px] border border-slate-200 bg-white">
							<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
								<div className="flex items-center gap-2 font-semibold text-slate-900">
									<Target className="h-4 w-4 text-cyan-700" />
									Сделки
								</div>
								<span className="text-xs text-slate-500">{deals.length}</span>
							</div>
							<div className="divide-y divide-slate-100">
								{deals.length ? (
									deals.map((deal) => (
										<div key={deal.id} className="px-4 py-3">
											<div className="flex items-center justify-between gap-3">
												<div>
													<div className="font-semibold text-slate-900">
														{DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}
													</div>
													<div className="text-xs text-slate-500">
														Вероятность {deal.probability ?? 0}% · закрытие {formatDate(deal.expectedCloseDate)}
													</div>
												</div>
												<div className="font-mono text-sm font-bold text-emerald-700">
													{formatCurrency(deal.dealAmount, deal.currency)}
												</div>
											</div>
										</div>
									))
								) : (
									<div className="px-4 py-8 text-center text-sm text-slate-500">
										Сделок по клиенту пока нет
									</div>
								)}
							</div>
						</section>

						<section className="rounded-[22px] border border-slate-200 bg-white">
							<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
								<div className="flex items-center gap-2 font-semibold text-slate-900">
									<FileSignature className="h-4 w-4 text-cyan-700" />
									Договоры
								</div>
								<span className="text-xs text-slate-500">{contracts.length}</span>
							</div>
							<div className="divide-y divide-slate-100">
								{contracts.length ? (
									contracts.map((contract) => (
										<div key={contract.id} className="px-4 py-3">
											<div className="flex items-center justify-between gap-3">
												<div>
													<div className="font-semibold text-slate-900">
														{contract.contractNumber}
													</div>
													<div className="text-xs text-slate-500">
														{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status} · {formatDate(contract.signDate)}
													</div>
												</div>
												<div className="font-mono text-sm font-bold text-slate-950">
													{formatCurrency(contract.totalAmount, contract.currency)}
												</div>
											</div>
										</div>
									))
								) : (
									<div className="px-4 py-8 text-center text-sm text-slate-500">
										Договоров по клиенту пока нет
									</div>
								)}
							</div>
						</section>

						<section className="rounded-[22px] border border-slate-200 bg-white p-4">
							<div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
								<CalendarDays className="h-4 w-4 text-cyan-700" />
								История
							</div>
							<div className="space-y-3">
								{events.map((event, index) => (
									<div key={`${event.title}-${index}`} className="flex gap-3">
										<div className="mt-1 h-2 w-2 rounded-full bg-cyan-600" />
										<div>
											<div className="text-sm font-semibold text-slate-900">{event.title}</div>
											<div className="text-xs text-slate-500">
												{formatDate(event.date)} · {event.meta}
											</div>
										</div>
									</div>
								))}
							</div>
						</section>
					</div>
				) : (
					<div className="p-5 text-sm text-slate-500">Выберите клиента из списка</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

function getClientStatusBadge(status: string) {
	const opt = STATUS_OPTIONS.find((s) => s.value === status);
	return (
		<Badge
			className={cn("text-xs", opt?.color || "bg-gray-100 text-gray-800")}
			variant="secondary"
		>
			{opt?.label || status}
		</Badge>
	);
}

export default function Clients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedClient, setSelectedClient] = useState<Client | undefined>();
	const [detailsClient, setDetailsClient] = useState<Client | undefined>();
	const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const { toast } = useToast();

	const loadClients = async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | undefined> = {
				type: typeFilter !== "all" ? typeFilter : undefined,
			};
			const response = await api.get<Client[]>("/crm/clients", { params });
			setClients(Array.isArray(response.data) ? response.data : []);
		} catch (err: any) {
			toast({
				title: "Ошибка загрузки",
				description: err.message || "Не удалось загрузить клиентов",
				variant: "destructive",
			});
			setClients([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadClients();
	}, [typeFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await api.delete(`/crm/clients/${deleteId}`);
			toast({ title: "Клиент удалён" });
			if (detailsClient?.id === deleteId) setDetailsClient(undefined);
			loadClients();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description: err.message || "Не удалось удалить клиента",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const getStatusBadge = (status: string) => {
		const opt = STATUS_OPTIONS.find((s) => s.value === status);
		return (
			<Badge
				className={cn("text-xs", opt?.color || "bg-gray-100 text-gray-800")}
				variant="secondary"
			>
				{opt?.label || status}
			</Badge>
		);
	};

	const getTypeBadge = (type: string) => {
		const opt = TYPE_OPTIONS.find((t) => t.value === type);
		return (
			<Badge className="text-xs bg-blue-100 text-blue-800" variant="secondary">
				{opt?.label || type}
			</Badge>
		);
	};

	const columns = useMemo<ColumnDef<Client, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "Имя / Название",
				size: 200,
				meta: { exportLabel: "Имя / Название" },
				cell: ({ row }) => (
					<span className="font-medium text-gray-900">
						{row.original.fullName}
					</span>
				),
			},
			{
				accessorKey: "type",
				header: "Тип",
				size: 140,
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => getTypeBadge(row.original.type),
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 130,
				meta: { exportLabel: "Телефон" },
				cell: ({ row }) => (
					<span className="text-gray-600">{row.original.phone}</span>
				),
			},
			{
				accessorKey: "email",
				header: "Почта",
				size: 160,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => (
					<span className="text-gray-500 text-sm">
						{row.original.email || "—"}
					</span>
				),
			},
			{
				id: "budget",
				header: "Бюджет",
				size: 120,
				accessorFn: (row) => row.budget ?? 0,
				meta: { exportLabel: "Бюджет (сом)", align: "right" },
				cell: ({ row }) => (
					<span className="font-mono text-sm">
						{row.original.budget
							? `${row.original.budget.toLocaleString("ru-KG")} сом`
							: "—"}
					</span>
				),
			},
			{
				id: "creditApproved",
				header: "Кредит",
				size: 90,
				accessorFn: (row) => (row.creditApproved ? 1 : 0),
				meta: { exportLabel: "Кредит одобрен" },
				cell: ({ row }) =>
					row.original.creditApproved ? (
						<Badge
							className="text-xs bg-emerald-100 text-emerald-800"
							variant="secondary"
						>
							Да
						</Badge>
					) : (
						<span className="text-xs text-gray-600">—</span>
					),
			},
			{
				accessorKey: "status",
				header: "Статус",
				size: 110,
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => getStatusBadge(row.original.status),
			},
			{
				id: "__actions",
				header: "",
				size: 90,
				enableSorting: false,
				cell: ({ row }) => {
					const client = row.original;
					return (
						<div
							className="flex gap-1"
							onClick={(e) => e.stopPropagation()}
						>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setSelectedClient(client);
									setDialogOpen(true);
								}}
								title="Редактировать"
							>
								<Edit2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-rose-600 hover:text-rose-700"
								onClick={() => setDeleteId(client.id)}
								title="Удалить"
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[],
	);

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Users className="w-6 h-6 text-blue-600" /> Клиенты 360
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Карточка клиента, сделки, договоры и история в одном правом окне
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedClient(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить клиента
				</Button>
			</div>

			<div className="rounded-[22px] border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-slate-700">
				<span className="font-semibold text-slate-950">Новая CRM-логика:</span>{" "}
				нажмите на строку клиента, чтобы открыть справа карточку 360 со сделками,
				договорами, контактами и историей.
			</div>

			<DataTable
				tableId="crm-clients"
				columns={columns}
				data={clients}
				isLoading={isLoading}
				onRowClick={(client) => setDetailsClient(client)}
				rowClassName={(client) =>
					detailsClient?.id === client.id ? "bg-cyan-50/80" : ""
				}
				enableSearch
				searchPlaceholder="Поиск по имени, телефону, email..."
				toolbar={
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-44">
							<SelectValue placeholder="Все типы" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все типы</SelectItem>
							{TYPE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Users className="w-8 h-8 text-gray-200" />
						<p className="text-gray-600">Клиенты не найдены</p>
					</div>
				}
			/>

			<ClientDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				client={selectedClient}
				onSuccess={() => {
					loadClients();
					setDetailsRefreshKey((value) => value + 1);
				}}
			/>

			<ClientRecordSheet
				client={detailsClient}
				open={Boolean(detailsClient)}
				onOpenChange={(open) => {
					if (!open) setDetailsClient(undefined);
				}}
				onEdit={(client) => {
					setSelectedClient(client);
					setDialogOpen(true);
				}}
				refreshKey={detailsRefreshKey}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Клиент и все связанные данные будут
							удалены из системы.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-rose-600 hover:bg-rose-700"
						>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
