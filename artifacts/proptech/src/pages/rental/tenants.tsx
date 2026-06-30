import { useQueryClient } from "@tanstack/react-query";
import { Edit2, ExternalLink, Plus, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
	type CreateTenantBodyStatus,
	getListTenantsQueryKey,
	type Tenant,
	useCreateTenant,
	useListTenants,
	useUpdateTenant,
} from "@/api-client";
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
import { Badge } from "@/components/ui/badge";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

const typeLabels: Record<string, string> = {
	individual: "Физлицо",
	company: "Юрлицо",
};

const statusColors: Record<string, string> = {
	active: "bg-emerald-100 text-emerald-800",
	inactive: "bg-gray-100 text-gray-800",
	blacklisted: "bg-rose-100 text-rose-800",
};

const statusLabels: Record<string, string> = {
	active: "Активный",
	inactive: "Неактивный",
	blacklisted: "Черный список",
};

type ContactPhone = { number: string; owner: string };

function normalizeContactPhones(value: unknown, fallbackPhone?: string | null): ContactPhone[] {
	const raw = Array.isArray(value) ? value : [];
	const phones = raw
		.map((entry) => {
			const p = entry && typeof entry === "object" ? (entry as { number?: unknown; owner?: unknown }) : {};
			return {
				number: typeof p.number === "string" ? p.number : "",
				owner: typeof p.owner === "string" ? p.owner : "",
			};
		})
		.filter((p) => p.number.trim() || p.owner.trim());
	if (phones.length === 0) phones.push({ number: fallbackPhone || "", owner: "" });
	return phones;
}

function formatPhonesList(value: unknown, fallbackPhone?: string | null): string {
	return normalizeContactPhones(value, fallbackPhone)
		.filter((p) => p.number.trim())
		.map((p) => (p.owner ? `${p.number} (${p.owner})` : p.number))
		.join("; ");
}

function fmtDateTime(value: string | null | undefined) {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("ru-RU");
}

interface TenantDialogProps {
	open: boolean;
	onClose: () => void;
	tenant?: Tenant;
}

function TenantDialog({ open, onClose, tenant }: TenantDialogProps) {
	const createMutation = useCreateTenant();
	const updateMutation = useUpdateTenant();
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		fullName: "",
		phone: "",
		phones: [{ number: "", owner: "" }] as ContactPhone[],
		email: "",
		iin: "",
		status: "active" as CreateTenantBodyStatus,
		comment: "",
	});

	useEffect(() => {
		if (tenant && open) {
			setFormData({
				fullName: tenant.fullName,
				phone: tenant.phone || "",
				phones: normalizeContactPhones((tenant as any).phones, tenant.phone),
				email: tenant.email || "",
				iin: tenant.iin || "",
				status: tenant.status as CreateTenantBodyStatus,
				comment: tenant.comment || "",
			});
		} else if (!tenant && open) {
			setFormData({
				fullName: "",
				phone: "",
				phones: [{ number: "", owner: "" }],
				email: "",
				iin: "",
				status: "active",
				comment: "",
			});
		}
	}, [tenant, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				fullName: formData.fullName,
				phone: formData.phones[0]?.number || formData.phone || null,
				phones: formData.phones
					.map((p) => ({ number: p.number.trim(), owner: p.owner.trim() || null }))
					.filter((p) => p.number),
				email: formData.email || null,
				iin: formData.iin || null,
				status: formData.status,
				comment: formData.comment || null,
			};

			if (tenant) {
				await updateMutation.mutateAsync({ id: tenant.id, data: payload });
				toast({ title: "Арендатор обновлён" });
			} else {
				await createMutation.mutateAsync({ data: payload });
				toast({ title: "Арендатор добавлен" });
			}

			queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
			onClose();
		} catch {
			toast({
				title: "Ошибка",
				description: "Не удалось сохранить арендатора",
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
						{tenant ? "Редактировать арендатора" : "Добавить арендатора"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="fullName">ФИО *</Label>
						<Input
							id="fullName"
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="iin">ИИН</Label>
						<Input
							id="iin"
							value={formData.iin}
							onChange={(e) =>
								setFormData({ ...formData, iin: e.target.value })
							}
							placeholder="880101300122"
						/>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
						<div className="mb-2 flex items-center justify-between gap-3">
							<div>
								<Label className="text-sm font-semibold">Телефоны</Label>
								<p className="text-xs text-slate-500">
									Добавляйте номера директора, бухгалтера или ответственного.
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
											setFormData({
												...formData,
												phones,
												phone: index === 0 ? e.target.value : formData.phone,
											});
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
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
						/>
					</div>
					<div>
						<Label htmlFor="status">Статус</Label>
						<Select
							value={formData.status}
							onValueChange={(v) =>
								setFormData({
									...formData,
									status: v as CreateTenantBodyStatus,
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">Активный</SelectItem>
								<SelectItem value="inactive">Неактивный</SelectItem>
								<SelectItem value="blacklisted">Черный список</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="comment">Комментарий</Label>
						<Input
							id="comment"
							value={formData.comment}
							onChange={(e) =>
								setFormData({ ...formData, comment: e.target.value })
							}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						{tenant && (
							<Button
								type="button"
								variant="outline"
								className="mr-auto text-rose-600 border-rose-200 hover:bg-rose-50"
								disabled={isPending}
								onClick={async () => {
									if (
										!confirm(
											`Удалить арендатора «${tenant.fullName}»?\n\nДействие необратимо.`,
										)
									) {
										return;
									}
									try {
										await api.delete(`/rental/tenants/${tenant.id}`);
										toast({ title: "Арендатор удалён" });
										queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
										onClose();
									} catch (e: unknown) {
										const msg =
											e && typeof e === "object" && "response" in e
												? getApiErrorMessage(e)
												: null;
										toast({
											title: "Не удалось удалить",
											description: msg || undefined,
											variant: "destructive",
										});
									}
								}}
							>
								<Trash2 className="w-4 h-4 mr-1" />
								Удалить
							</Button>
						)}
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

export default function RentalTenants() {
	const { data: tenants, isLoading, isError, error, refetch } = useListTenants();
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const tenantsArray = Array.isArray(tenants) ? tenants : [];
	const [, navigate] = useLocation();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();

	const activeCount = tenantsArray.filter((t) => t.status === "active").length;
	const inactiveCount = tenantsArray.length - activeCount;
	const companyCount = tenantsArray.filter((t) => (t as Tenant & { type?: string }).type === "company").length;
	const individualCount = tenantsArray.length - companyCount;

	const handleAdd = () => { setSelectedTenant(undefined); setDialogOpen(true); };
	const handleEdit = useCallback((tenant: Tenant) => {
		setSelectedTenant(tenant);
		setDialogOpen(true);
	}, []);

	const handleDelete = useCallback(async (tenant: Tenant) => {
		if (
			!confirm(
				`Удалить арендатора «${tenant.fullName}»?\n\nДействие необратимо. Удаление возможно только без активных договоров и задолженности.`,
			)
		) {
			return;
		}
		try {
			await api.delete(`/rental/tenants/${tenant.id}`);
			toast({ title: "Арендатор удалён" });
			queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? getApiErrorMessage(e)
					: null;
			toast({
				title: "Не удалось удалить",
				description: msg || "Сначала расторгните или удалите связанные договоры",
				variant: "destructive",
			});
		}
	}, [queryClient, toast]);

	const columns = useMemo<ColumnDef<Tenant, unknown>[]>(
		() => [
			{
				accessorKey: "fullName",
				header: "ФИО",
				size: 220,
				meta: { exportLabel: "ФИО", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.fullName}</span>
				),
			},
			{
				accessorKey: "iin",
				header: "ИИН",
				size: 130,
				meta: { exportLabel: "ИИН" },
				cell: ({ row }) => row.original.iin || "—",
			},
			{
				accessorKey: "phone",
				header: "Телефон",
				size: 140,
				meta: { exportLabel: "Телефон" },
				cell: ({ row }) => {
					const phones = normalizeContactPhones((row.original as any).phones, row.original.phone)
						.filter((p) => p.number.trim());
					if (!phones.length) return "—";
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
				size: 180,
				meta: { exportLabel: "Email" },
				cell: ({ row }) => row.original.email || "—",
			},
			{
				id: "type",
				header: "Тип",
				size: 110,
				accessorFn: (row) =>
					typeLabels[(row as Tenant & { type?: string }).type || ""] ||
					(row as Tenant & { type?: string }).type ||
					"—",
				meta: { exportLabel: "Тип" },
				cell: ({ row }) => {
					const type = (row.original as Tenant & { type?: string }).type || "individual";
					return typeLabels[type] || type;
				},
			},
			{
				id: "phonesAll",
				header: "Все телефоны",
				size: 220,
				accessorFn: (row) =>
					formatPhonesList((row as Tenant & { phones?: unknown }).phones, row.phone),
				meta: { exportLabel: "Все телефоны", grow: true },
				cell: ({ row }) => {
					const phones = normalizeContactPhones(
						(row.original as Tenant & { phones?: unknown }).phones,
						row.original.phone,
					).filter((p) => p.number.trim());
					if (!phones.length) return "—";
					return (
						<div className="space-y-0.5 text-sm">
							{phones.map((p, i) => (
								<div key={i}>
									<span className="font-medium text-slate-700">{p.number}</span>
									{p.owner ? (
										<span className="ml-1 text-[11px] text-slate-500">({p.owner})</span>
									) : null}
								</div>
							))}
						</div>
					);
				},
			},
			{
				accessorKey: "comment",
				header: "Комментарий",
				size: 180,
				meta: { exportLabel: "Комментарий", grow: true, truncate: true },
				cell: ({ row }) => row.original.comment || "—",
			},
			{
				id: "counterpartyId",
				header: "Контрагент",
				size: 110,
				accessorFn: (row) =>
					(row as Tenant & { counterpartyId?: number | null }).counterpartyId ?? "—",
				meta: { exportLabel: "ID контрагента", align: "right" },
				cell: ({ row }) => {
					const id = (row.original as Tenant & { counterpartyId?: number | null })
						.counterpartyId;
					return id ?? "—";
				},
			},
			{
				accessorKey: "createdAt",
				header: "Создан",
				size: 150,
				meta: { exportLabel: "Создан" },
				cell: ({ row }) => fmtDateTime(row.original.createdAt),
			},
			{
				accessorKey: "updatedAt",
				header: "Обновлён",
				size: 150,
				meta: { exportLabel: "Обновлён" },
				cell: ({ row }) => fmtDateTime(row.original.updatedAt),
			},
			{
				id: "status",
				header: "Статус",
				size: 130,
				accessorKey: "status",
				meta: { exportLabel: "Статус" },
				cell: ({ row }) => (
					<Badge
						className={statusColors[row.original.status]}
						variant="secondary"
					>
						{statusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "",
				size: 140,
				enableSorting: false,
				meta: { align: "center" },
				cell: ({ row }) => (
					<div className="flex items-center justify-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs text-blue-600"
							onClick={() => navigate(`/rental/tenants/${row.original.id}`)}
						>
							<ExternalLink className="w-3 h-3 mr-1" /> Портал
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => handleEdit(row.original)}
						>
							<Edit2 className="w-3.5 h-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-rose-600"
							onClick={() => handleDelete(row.original)}
						>
							<Trash2 className="w-3.5 h-3.5" />
						</Button>
					</div>
				),
			},
		],
		[handleDelete, handleEdit, navigate],
	);

	return (
		<div className="p-6 space-y-3">
			<KpiRow>
				<KpiCard variant="strip" label="Всего арендаторов" value={tenantsArray.length} sub="в базе" icon={Users} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Активных" value={activeCount} sub={inactiveCount > 0 ? `${inactiveCount} неактивных` : "все активны"} icon={UserCheck} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Физлица" value={individualCount} sub={`${companyCount} юрлиц`} icon={Users} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Неактивных" value={inactiveCount} sub={inactiveCount > 0 ? "требуют проверки" : "нет"} icon={UserX} color={inactiveCount > 0 ? "yellow" : "green"} loading={isLoading} />
			</KpiRow>

			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Арендаторы</h1>
					<p className="text-muted-foreground text-sm">Управление базой арендаторов</p>
				</div>
				<Button onClick={handleAdd}>
					<Plus className="w-4 h-4 mr-2" />Добавить
				</Button>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
				<DataTable maxHeight="calc(100vh - 320px)"
					tableId="rental-tenants"
					columns={columns}
					data={tenantsArray}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по ФИО, телефону, email, ИИН…"
					initialSorting={[{ id: "fullName", desc: false }]}
					emptyState="Арендаторы не найдены"
					footer={
						!isLoading && tenantsArray.length > 0 ? (
							<tr className="bg-gray-50 font-semibold border-t-2">
								<td colSpan={columns.length - 1} className="px-3 py-2 text-sm text-gray-600">
									Итого: {tenantsArray.length} арендаторов · {activeCount} активных
								</td>
								<td />
							</tr>
						) : undefined
					}
				/>
			</RentalQueryState>

			<TenantDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tenant={selectedTenant} />
		</div>
	);
}
