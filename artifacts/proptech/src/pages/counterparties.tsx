import { getApiErrorMessage } from "@/lib/api-error";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Briefcase, Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useSearch } from "wouter";
import {
	type Counterparty,
	type CreateCounterpartyBodyType,
	getListCounterpartiesQueryKey,
	useCreateCounterparty,
	useDeleteCounterparty,
	useListCounterparties,
	useUpdateCounterparty,
} from "@/api-client";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
	{ key: "all", label: "Все" },
	{ key: "tenant", label: "Арендаторы" },
	{ key: "buyer", label: "Покупатели" },
	{ key: "supplier", label: "Поставщики" },
	{ key: "contractor", label: "Подрядчики" },
	{ key: "owner", label: "Собственники" },
	{ key: "other", label: "Прочие" },
];

const CATEGORY_COLORS: Record<string, string> = {
	tenant: "bg-blue-100 text-blue-800",
	buyer: "bg-indigo-100 text-indigo-800",
	supplier: "bg-amber-100 text-amber-800",
	contractor: "bg-amber-100 text-amber-800",
	owner: "bg-emerald-100 text-emerald-700",
	other: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
	individual: "Физлицо",
	company: "Юрлицо",
};

const CATEGORY_LABELS: Record<string, string> = {
	tenant: "Арендатор",
	buyer: "Покупатель",
	supplier: "Поставщик",
	contractor: "Подрядчик",
	owner: "Собственник",
	other: "Прочее",
};

type ContactPhone = { number: string; owner: string };

function normalizeContactPhones(value: unknown, fallbackPhone?: string | null): ContactPhone[] {
	const raw = Array.isArray(value) ? value : [];
	const phones = raw
		.map((p: any) => ({
			number: typeof p?.number === "string" ? p.number : "",
			owner: typeof p?.owner === "string" ? p.owner : "",
		}))
		.filter((p) => p.number.trim() || p.owner.trim());
	if (phones.length === 0) {
		phones.push({ number: fallbackPhone || "", owner: "" });
	}
	return phones;
}

interface CounterpartyDialogProps {
	open: boolean;
	onClose: () => void;
	counterparty?: Counterparty;
}

function CounterpartyDialog({
	open,
	onClose,
	counterparty,
}: CounterpartyDialogProps) {
	const createMutation = useCreateCounterparty();
	const updateMutation = useUpdateCounterparty();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const { data: legalRaw = [] } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () =>
			api
				.get<{ id: number; name: string; isActive?: boolean }[]>("/legal-entities")
				.then((r) => r.data),
	});
	const legalEntities = (Array.isArray(legalRaw) ? legalRaw : []).filter(
		(e) => e.isActive !== false,
	);

	const [formData, setFormData] = useState({
		fullName: "",
		type: "individual",
		category: "tenant",
		iin: "",
		phone: "",
		phones: [{ number: "", owner: "" }] as ContactPhone[],
		email: "",
		address: "",
		additionalContact: "",
		comment: "",
		linkedLegalEntityId: "",
	});

	useEffect(() => {
		if (counterparty && open) {
			setFormData({
				fullName: counterparty.fullName,
				type: counterparty.type || "individual",
				category: counterparty.category || "other",
				iin: counterparty.iin || "",
				phone: counterparty.phone || "",
				phones: normalizeContactPhones(counterparty.phones, counterparty.phone),
				email: counterparty.email || "",
				address: counterparty.address || "",
				additionalContact: counterparty.additionalContact || "",
				comment: counterparty.comment || "",
				linkedLegalEntityId:
					counterparty.linkedLegalEntityId != null
						? String(counterparty.linkedLegalEntityId)
						: "",
			});
		} else if (!counterparty && open) {
			setFormData({
				fullName: "",
				type: "individual",
				category: "tenant",
				iin: "",
				phone: "",
				phones: [{ number: "", owner: "" }],
				email: "",
				address: "",
				additionalContact: "",
				comment: "",
				linkedLegalEntityId: "",
			});
		}
	}, [counterparty, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				fullName: formData.fullName,
				type: formData.type as CreateCounterpartyBodyType,
				category: formData.category,
				iin: formData.iin || null,
				phone: formData.phones[0]?.number || formData.phone || null,
				phones: formData.phones
					.map((p) => ({ number: p.number.trim(), owner: p.owner.trim() || null }))
					.filter((p) => p.number),
				email: formData.email || null,
				address: formData.address || null,
				additionalContact: formData.additionalContact || null,
				comment: formData.comment || null,
				linkedLegalEntityId: formData.linkedLegalEntityId
					? Number(formData.linkedLegalEntityId)
					: null,
			};
			if (counterparty) {
				await updateMutation.mutateAsync({
					id: counterparty.id,
					data: payload,
				});
				toast({ title: "Контрагент обновлён" });
			} else {
				await createMutation.mutateAsync({ data: payload });
				toast({ title: "Контрагент добавлен" });
			}
			queryClient.invalidateQueries({
				queryKey: getListCounterpartiesQueryKey(),
			});
			onClose();
		} catch (err: any) {
			toast({
				title: "Ошибка",
				description:
					getApiErrorMessage(err, "Не удалось сохранить контрагента"),
				variant: "destructive",
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{counterparty
							? "Редактировать контрагента"
							: "Добавить контрагента"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип *</Label>
							<Select
								value={formData.type}
								onValueChange={(v) => setFormData({ ...formData, type: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="individual">Физическое лицо</SelectItem>
									<SelectItem value="company">Юридическое лицо</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Категория *</Label>
							<Select
								value={formData.category}
								onValueChange={(v) => setFormData({ ...formData, category: v })}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="tenant">Арендатор</SelectItem>
									<SelectItem value="buyer">Покупатель</SelectItem>
									<SelectItem value="supplier">Поставщик</SelectItem>
									<SelectItem value="contractor">Подрядчик</SelectItem>
									<SelectItem value="owner">Собственник</SelectItem>
									<SelectItem value="other">Прочее</SelectItem>
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
									? 'ОсОО "Ваша Компания" / АО / ЗАО'
									: "Иванов Иван Иванович"
							}
							required
							className="mt-1"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">
								{formData.type === "company" ? "ИНН (ОГРН)" : "ИНН (ИИН)"}
							</Label>
							<Input
								value={formData.iin}
								onChange={(e) =>
									setFormData({ ...formData, iin: e.target.value })
								}
								placeholder="12345678901234"
								className="mt-auto"
							/>
						</div>
					</div>

					<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
						<div className="mb-2 flex items-center justify-between gap-3">
							<div>
								<Label className="text-sm font-semibold">Телефоны</Label>
								<p className="text-xs text-slate-500">
									Можно указать директора, бухгалтера или ответственного.
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setFormData({
										...formData,
										phones: [...formData.phones, { number: "", owner: "" }],
									})
								}
							>
								<Plus className="mr-1 h-3.5 w-3.5" />
								Номер
							</Button>
						</div>
						<div className="space-y-2">
							{formData.phones.map((phoneRow, index) => (
								<div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
									<Input
										value={phoneRow.number}
										onChange={(e) => {
											const phones = [...formData.phones];
											phones[index] = { ...phones[index], number: e.target.value };
											setFormData({ ...formData, phones, phone: index === 0 ? e.target.value : formData.phone });
										}}
										placeholder="+996 700 000 000"
									/>
									<Input
										value={phoneRow.owner}
										onChange={(e) => {
											const phones = [...formData.phones];
											phones[index] = { ...phones[index], owner: e.target.value };
											setFormData({ ...formData, phones });
										}}
										placeholder="Владелец номера: директор, бухгалтер..."
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="text-slate-400 hover:text-rose-600"
										disabled={formData.phones.length === 1}
										onClick={() =>
											setFormData({
												...formData,
												phones: formData.phones.filter((_, i) => i !== index),
											})
										}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</div>

					<div>
						<Label>Email</Label>
						<Input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="example@mail.kg"
							className="mt-1"
						/>
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

					<div>
						<Label>Комментарий</Label>
						<Input
							value={formData.comment}
							onChange={(e) =>
								setFormData({ ...formData, comment: e.target.value })
							}
							className="mt-1"
						/>
					</div>

					{formData.type === "company" && legalEntities.length > 0 && (
						<div>
							<Label className="leading-tight mb-1.5">
								Связанное ОсОО (внутригрупповое)
							</Label>
							<Select
								value={formData.linkedLegalEntityId || "none"}
								onValueChange={(v) =>
									setFormData({
										...formData,
										linkedLegalEntityId: v === "none" ? "" : v,
									})
								}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Не входит в холдинг" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Не входит в холдинг</SelectItem>
									{legalEntities.map((le) => (
										<SelectItem key={le.id} value={String(le.id)}>
											{le.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="mt-1 text-xs text-gray-500">
								Обороты с этим контрагентом исключаются из управленческого
								свода (внутригрупповые).
							</p>
						</div>
					)}

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function Counterparties() {
	const searchString = useSearch();
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const { data: counterparties, isLoading } = useListCounterparties({
		type: typeFilter !== "all" ? typeFilter : undefined,
	});
	const deleteMutation = useDeleteCounterparty();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedCP, setSelectedCP] = useState<Counterparty | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(
			searchString.startsWith("?") ? searchString.slice(1) : searchString,
		);
		if (params.get("create") === "1") {
			setSelectedCP(undefined);
			setDialogOpen(true);
		}
	}, [searchString]);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await deleteMutation.mutateAsync({ id: deleteId });
			toast({ title: "Контрагент удалён" });
			queryClient.invalidateQueries({
				queryKey: getListCounterpartiesQueryKey(),
			});
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось удалить контрагента",
				variant: "destructive",
			});
		}
		setDeleteId(null);
	};

	const counterpartiesArray = Array.isArray(counterparties)
		? counterparties
		: [];
	const filtered = counterpartiesArray.filter((cp) => {
		if (categoryFilter === "all") return true;
		return cp.category === categoryFilter;
	});

	const columns = useMemo<ColumnDef<Counterparty, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "ФИО / Наименование",
				size: 200,
				meta: { exportLabel: "ФИО / Наименование", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium text-gray-900">
						{row.original.fullName}
					</span>
				),
			},
			{
				id: "category",
				header: "Категория",
				size: 120,
				accessorFn: (row) => row.category || "other",
				meta: { exportLabel: "Категория" },
				cell: ({ row }) => {
					const cat = row.original.category || "other";
					return (
						<Badge
							className={cn(
								"text-xs",
								CATEGORY_COLORS[cat] || CATEGORY_COLORS.other,
							)}
							variant="secondary"
						>
							{CATEGORY_LABELS[cat] || cat || "—"}
						</Badge>
					);
				},
			},
			{
				accessorKey: "type",
				header: "Тип",
				size: 100,
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => (
					<span className="text-xs text-gray-500">
						{TYPE_LABELS[row.original.type] || row.original.type}
					</span>
				),
			},
			{
				accessorKey: "iin",
				header: "ИНН",
				size: 130,
				meta: { exportLabel: "ИНН" },
				cell: ({ row }) => (
					<span className="text-gray-500">{row.original.iin || "—"}</span>
				),
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 170,
				meta: { exportLabel: "Телефон" },
				cell: ({ row }) => {
					const phones = normalizeContactPhones(row.original.phones, row.original.phone)
						.filter((p) => p.number.trim());
					if (!phones.length) return <span className="text-gray-500">—</span>;
					return (
						<div className="space-y-0.5">
							<div className="text-sm font-medium text-slate-700">{phones[0].number}</div>
							{phones[0].owner && <div className="text-[11px] text-slate-500">{phones[0].owner}</div>}
							{phones.length > 1 && <div className="text-[11px] text-cyan-700">+{phones.length - 1} еще</div>}
						</div>
					);
				},
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
				id: "__actions",
				header: "",
				size: 80,
				enableSorting: false,
				cell: ({ row }) => {
					const cp = row.original;
					return (
						<div
							className="flex gap-1"
							onClick={(e) => e.stopPropagation()}
						>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setSelectedCP(cp);
									setDialogOpen(true);
								}}
							>
								<Edit2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-rose-600 hover:text-rose-700"
								onClick={() => setDeleteId(cp.id)}
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

	// Count by category
	const countByCategory = counterpartiesArray.reduce(
		(acc, cp) => {
			const cat = cp.category || "other";
			acc[cat] = (acc[cat] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="space-y-5">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Briefcase className="w-6 h-6 text-blue-600" /> Справочник
						контрагентов
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Арендаторы, покупатели, поставщики и подрядчики
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedCP(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить
				</Button>
			</div>

			<DataTable maxHeight="calc(100vh - 320px)"
				tableId="counterparties"
				columns={columns}
				data={filtered}
				isLoading={isLoading}
				enableSearch
				searchPlaceholder="Поиск по имени, телефону, ИНН..."
				toolbar={
					<>
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Категория" />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((cat) => (
									<SelectItem key={cat.key} value={cat.key}>
										{cat.label}
										{cat.key !== "all"
											? ` (${countByCategory[cat.key] || 0})`
											: ` (${counterpartiesArray.length})`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={typeFilter} onValueChange={setTypeFilter}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Все типы" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Все типы</SelectItem>
								<SelectItem value="individual">Физические лица</SelectItem>
								<SelectItem value="company">Юридические лица</SelectItem>
							</SelectContent>
						</Select>
					</>
				}
				emptyState={
					<div className="flex flex-col items-center gap-2">
						<Briefcase className="w-8 h-8 text-gray-200" />
						<p className="text-gray-600">Контрагенты не найдены</p>
					</div>
				}
			/>

			<CounterpartyDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				counterparty={selectedCP}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить контрагента?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Контрагент будет удалён из системы.
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
