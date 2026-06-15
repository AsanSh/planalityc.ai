import { useListRentalProperties, getListRentalPropertiesQueryKey } from "@/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Home, Pencil, Plus, Trash2, UserCircle, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { KpiCard, KpiRow } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { RentalQueryState } from "@/components/rental/rental-query-state";
import { getApiErrorMessage } from "@/lib/api-error";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/rental-format";

const statusColors: Record<string, string> = {
	free: "bg-emerald-100 text-emerald-700 border border-emerald-200",
	rented: "bg-blue-100 text-blue-700 border border-blue-200",
	overdue: "bg-rose-100 text-rose-700 border border-rose-200",
	archived: "bg-gray-100 text-gray-600 border border-gray-200",
};

const statusLabels: Record<string, string> = {
	free: "Свободен",
	rented: "Сдан",
	overdue: "Просрочен",
	archived: "Архив",
};

const typeLabels: Record<string, string> = {
	apartment: "Квартира",
	office: "Офис",
	parking: "Парковка",
	storage: "Кладовая",
};

type RentalPropertyRow = {
	id: number;
	projectName: string;
	unitNumber: string;
	type: string;
	area?: number | null;
	block?: string | null;
	floor?: number | null;
	rentalStatus: string;
	currentTenantName?: string | null;
	currentRentAmount?: number | null;
	currency?: string | null;
	comment?: string | null;
};

type FormState = {
	projectName: string;
	unitNumber: string;
	type: string;
	area: string;
	block: string;
	floor: string;
	comment: string;
};

const EMPTY_FORM: FormState = {
	projectName: "",
	unitNumber: "",
	type: "apartment",
	area: "",
	block: "",
	floor: "",
	comment: "",
};

// ── Property Form Fields ──────────────────────────────────────────────────────
function PropertyFormFields({ form, setField }: { form: FormState; setField: (k: keyof FormState, v: string) => void }) {
	return (
		<>
			<div>
				<Label className="text-xs">Проект / здание *</Label>
				<Input className="mt-1" value={form.projectName} onChange={(e) => setField("projectName", e.target.value)} placeholder="Например, ЖК Центральный" />
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				<div className="flex flex-col">
					<Label className="text-xs leading-tight mb-1.5">Номер / кабинет *</Label>
					<Input className="mt-auto" value={form.unitNumber} onChange={(e) => setField("unitNumber", e.target.value)} placeholder="101" />
				</div>
				<div className="flex flex-col">
					<Label className="text-xs leading-tight mb-1.5">Тип</Label>
					<Select value={form.type} onValueChange={(v) => setField("type", v)}>
						<SelectTrigger className="mt-auto"><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="apartment">Квартира</SelectItem>
							<SelectItem value="office">Офис</SelectItem>
							<SelectItem value="parking">Парковка</SelectItem>
							<SelectItem value="storage">Кладовая</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				<div className="flex flex-col">
					<Label className="text-xs leading-tight mb-1.5">Площадь, м²</Label>
					<Input className="mt-auto" type="number" value={form.area} onChange={(e) => setField("area", e.target.value)} />
				</div>
				<div className="flex flex-col">
					<Label className="text-xs leading-tight mb-1.5">Блок</Label>
					<Input className="mt-auto" value={form.block} onChange={(e) => setField("block", e.target.value)} />
				</div>
				<div className="flex flex-col">
					<Label className="text-xs leading-tight mb-1.5">Этаж</Label>
					<Input className="mt-auto" type="number" value={form.floor} onChange={(e) => setField("floor", e.target.value)} />
				</div>
			</div>
			<div>
				<Label className="text-xs">Комментарий</Label>
				<Textarea className="mt-1 resize-none" rows={2} value={form.comment} onChange={(e) => setField("comment", e.target.value)} />
			</div>
		</>
	);
}

// ── Property Owners Panel ─────────────────────────────────────────────────────
function PropertyOwnersPanel({ propertyId }: { propertyId: number }) {
	const qc = useQueryClient();
	const { toast } = useToast();

	const { data: allInvestors = [] } = useQuery<any[]>({
		queryKey: ["investors"],
		queryFn: () => api.get("/rental/investors").then((r) => r.data),
	});
	const { data: allInvestments = [], isLoading } = useQuery<any[]>({
		queryKey: ["investments"],
		queryFn: () => api.get("/rental/investments").then((r) => r.data),
	});

	const investments = allInvestments.filter((i) => i.propertyId === propertyId);
	const total = investments.reduce((s: number, i: any) => s + parseFloat(i.sharePercent || "0"), 0);
	const isValid = Math.abs(total - 100) < 0.01;

	const [addInvestorId, setAddInvestorId] = useState("");
	const [addShare, setAddShare] = useState("");
	const [adding, setAdding] = useState(false);

	const usedInvestorIds = new Set(investments.map((i: any) => String(i.investorId)));
	const availableInvestors = allInvestors.filter((inv) => !usedInvestorIds.has(String(inv.id)));

	const invalidate = () => qc.invalidateQueries({ queryKey: ["investments"] });

	const handleAdd = async () => {
		if (!addInvestorId || !addShare) return;
		const share = parseFloat(addShare);
		if (isNaN(share) || share <= 0) return;
		const newTotal = total + share;
		if (newTotal > 100.005) {
			toast({ title: "Превышение 100%", description: `Итого будет ${newTotal.toFixed(1)}% — нельзя превышать 100%`, variant: "destructive" });
			return;
		}
		setAdding(true);
		try {
			await api.post("/rental/investments", { propertyId, investorId: parseInt(addInvestorId), sharePercent: share });
			setAddInvestorId(""); setAddShare("");
			invalidate();
		} catch (e: any) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		} finally { setAdding(false); }
	};

	const handleShareChange = async (id: number, val: string) => {
		const share = parseFloat(val);
		if (isNaN(share)) return;
		const current = investments.find((i: any) => i.id === id);
		const oldShare = current ? parseFloat(current.sharePercent || "0") : 0;
		const newTotal = total - oldShare + share;
		if (newTotal > 100.005) {
			toast({ title: "Превышение 100%", description: `Итого будет ${newTotal.toFixed(1)}% — нельзя превышать 100%`, variant: "destructive" });
			return;
		}
		try {
			await api.patch(`/rental/investments/${id}`, { sharePercent: share });
			invalidate();
		} catch { /* ignore */ }
	};

	const handleDelete = async (id: number) => {
		try {
			await api.delete(`/rental/investments/${id}`);
			invalidate();
		} catch (e: any) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e), variant: "destructive" });
		}
	};

	if (isLoading) return <div className="py-4 text-sm text-gray-500">Загрузка...</div>;

	return (
		<div className="space-y-3 pt-1">
			<div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${isValid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
				<span>Итого долей</span>
				<span className="tabular-nums font-bold">{total.toFixed(1)}%{isValid ? " ✓" : " — должно быть 100%"}</span>
			</div>

			{investments.length === 0 ? (
				<p className="text-sm text-gray-500 text-center py-2">Владельцы не назначены</p>
			) : (
				<div className="space-y-2">
					{investments.map((inv: any) => {
						const investor = allInvestors.find((x) => x.id === inv.investorId);
						return (
							<div key={inv.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
								<UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
								<span className="flex-1 text-sm text-gray-800 truncate">{investor?.fullName ?? `Владелец #${inv.investorId}`}</span>
								<input
									type="number" min="0" max="100" step="0.1"
									defaultValue={parseFloat(inv.sharePercent).toFixed(1)}
									onBlur={(e) => handleShareChange(inv.id, e.target.value)}
									className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
								/>
								<span className="text-gray-400 text-sm">%</span>
								<button onClick={() => handleDelete(inv.id)} className="text-gray-400 hover:text-rose-500 transition-colors ml-1">
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						);
					})}
				</div>
			)}

			{availableInvestors.length > 0 && (
				<div className="flex gap-2 items-end border-t pt-3">
					<div className="flex-1">
						<Label className="text-xs">Добавить владельца</Label>
						<Select value={addInvestorId} onValueChange={setAddInvestorId}>
							<SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Выберите..." /></SelectTrigger>
							<SelectContent>
								{availableInvestors.map((inv) => (
									<SelectItem key={inv.id} value={String(inv.id)}>{inv.fullName}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="w-24">
						<Label className="text-xs">Доля %</Label>
						<Input className="mt-1 h-8 text-sm text-right" type="number" min="0" max="100" step="0.1"
							value={addShare} onChange={(e) => setAddShare(e.target.value)} placeholder="0" />
					</div>
					<Button size="sm" onClick={handleAdd} disabled={adding || !addInvestorId || !addShare} className="h-8">
						<Plus className="w-3.5 h-3.5" />
					</Button>
				</div>
			)}
		</div>
	);
}

export default function RentalProperties() {
	const searchString = useSearch();
	const { toast } = useToast();
	const qc = useQueryClient();
	const { data: properties, isLoading, isError, error, refetch } = useListRentalProperties();
	const propertiesArray = (Array.isArray(properties) ? properties : []) as RentalPropertyRow[];

	const [statusFilter, setStatusFilter] = useState("all");

	const filtered = useMemo(() => {
		if (statusFilter === "all") return propertiesArray;
		return propertiesArray.filter((p) => p.rentalStatus === statusFilter);
	}, [propertiesArray, statusFilter]);

	const rentedCount = propertiesArray.filter((p) => p.rentalStatus === "rented").length;
	const freeCount = propertiesArray.filter((p) => p.rentalStatus === "free").length;
	const totalArea = propertiesArray.reduce((s, p) => s + (p.area ?? 0), 0);
	const totalMonthlyRent = propertiesArray.reduce((s, p) => s + (p.currentRentAmount ? Number(p.currentRentAmount) : 0), 0);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<RentalPropertyRow | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const params = new URLSearchParams(searchString.startsWith("?") ? searchString : `?${searchString}`);
		if (params.get("create") === "1" || params.get("new") === "1") openCreate();
	}, [searchString]);

	const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };

	const openEdit = (p: RentalPropertyRow) => {
		setEditing(p);
		setForm({ projectName: p.projectName || "", unitNumber: p.unitNumber || "", type: p.type || "apartment", area: p.area != null ? String(p.area) : "", block: "", floor: "", comment: "" });
		setDialogOpen(true);
	};

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ["/rental/properties"] });
		qc.invalidateQueries({ queryKey: getListRentalPropertiesQueryKey() });
	};

	const handleSave = async () => {
		if (!form.projectName.trim() || !form.unitNumber.trim()) {
			toast({ title: "Заполните проект и номер объекта", variant: "destructive" });
			return;
		}
		setSaving(true);
		try {
			const body = { projectName: form.projectName.trim(), unitNumber: form.unitNumber.trim(), type: form.type, area: form.area ? form.area : null, block: form.block.trim() || null, floor: form.floor ? parseInt(form.floor, 10) : null, comment: form.comment.trim() || null };
			if (editing) { await api.patch(`/rental/properties/${editing.id}`, body); toast({ title: "Объект обновлён" }); }
			else { await api.post("/rental/properties", body); toast({ title: "Объект добавлен" }); }
			setDialogOpen(false);
			invalidate();
		} catch (e: unknown) {
			toast({ title: "Ошибка", description: getApiErrorMessage(e, "Не удалось сохранить"), variant: "destructive" });
		} finally { setSaving(false); }
	};

	const handleDelete = async (p: RentalPropertyRow) => {
		const label = `${p.projectName} ${p.unitNumber}`.trim();
		if (!confirm(`Удалить объект «${label}»?\n\nДействие необратимо.`)) return;
		try {
			await api.delete(`/rental/properties/${p.id}`);
			toast({ title: "Объект удалён" });
			if (editing?.id === p.id) setDialogOpen(false);
			invalidate();
		} catch (e: unknown) {
			toast({ title: "Не удалось удалить", description: getApiErrorMessage(e) || "Проверьте договоры и владельцев объекта", variant: "destructive" });
		}
	};

	const setField = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

	const columns = useMemo<ColumnDef<RentalPropertyRow>[]>(() => [
		{
			accessorKey: "projectName",
			header: "Проект",
			size: 180,
			cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.projectName}</span>,
		},
		{
			accessorKey: "unitNumber",
			header: "Номер",
			size: 90,
		},
		{
			accessorKey: "type",
			header: "Тип",
			size: 100,
			cell: ({ row }) => typeLabels[row.original.type] ?? row.original.type,
		},
		{
			accessorKey: "area",
			header: "Площадь, м²",
			size: 110,
			cell: ({ row }) => row.original.area ? <span className="tabular-nums">{row.original.area}</span> : "—",
		},
		{
			accessorKey: "currentTenantName",
			header: "Арендатор",
			size: 180,
			cell: ({ row }) => row.original.currentTenantName || <span className="text-gray-400">—</span>,
		},
		{
			accessorKey: "currentRentAmount",
			header: "Аренда / мес.",
			size: 130,
			cell: ({ row }) => row.original.currentRentAmount
				? <span className="tabular-nums font-medium">{fmtMoney(row.original.currentRentAmount, row.original.currency || "KGS")}</span>
				: <span className="text-gray-400">—</span>,
		},
		{
			accessorKey: "rentalStatus",
			header: "Статус",
			size: 110,
			cell: ({ row }) => (
				<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[row.original.rentalStatus] ?? "bg-gray-100 text-gray-600"}`}>
					{statusLabels[row.original.rentalStatus] ?? row.original.rentalStatus}
				</span>
			),
		},
		{
			id: "actions",
			header: "",
			size: 64,
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex items-center justify-center gap-1">
					<button type="button" title="Редактировать" className="text-gray-400 hover:text-gray-700 transition-colors" onClick={() => openEdit(row.original)}>
						<Pencil className="w-3.5 h-3.5" />
					</button>
					<button type="button" title="Удалить" className="text-gray-400 hover:text-rose-600 transition-colors" onClick={() => handleDelete(row.original)}>
						<Trash2 className="w-3.5 h-3.5" />
					</button>
				</div>
			),
		},
	], []);

	return (
		<div className="p-6 space-y-4">
			<KpiRow>
				<KpiCard variant="strip" label="Всего объектов" value={propertiesArray.length} sub="в реестре" icon={Building2} color="blue" loading={isLoading} />
				<KpiCard variant="strip" label="Сдано" value={rentedCount} sub={`${freeCount} свободно`} icon={Home} color="green" loading={isLoading} />
				<KpiCard variant="strip" label="Общая площадь" value={totalArea > 0 ? `${new Intl.NumberFormat("ru-RU").format(totalArea)} м²` : "—"} sub="по всем объектам" icon={Building2} color="purple" loading={isLoading} />
				<KpiCard variant="strip" label="Аренда в месяц" value={fmtMoney(totalMonthlyRent)} sub="по сданным объектам" icon={Wallet} color="yellow" loading={isLoading} />
			</KpiRow>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Building2 className="w-6 h-6 text-blue-600" />
						Объекты аренды
					</h1>
					<p className="text-sm text-muted-foreground">Реестр помещений для сдачи в аренду</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="h-9 w-40">
							<SelectValue placeholder="Все статусы" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Все статусы</SelectItem>
							<SelectItem value="free">Свободен</SelectItem>
							<SelectItem value="rented">Сдан</SelectItem>
							<SelectItem value="overdue">Просрочен</SelectItem>
							<SelectItem value="archived">Архив</SelectItem>
						</SelectContent>
					</Select>
					<Button onClick={openCreate} className="gap-2">
						<Plus className="w-4 h-4" />
						Добавить объект
					</Button>
				</div>
			</div>

			<RentalQueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
				<DataTable
					tableId="rental-properties"
					columns={columns}
					data={filtered}
					isLoading={isLoading}
					enableSearch
					searchPlaceholder="Поиск по проекту, номеру, арендатору…"
					initialSorting={[{ id: "projectName", desc: false }]}
					emptyState={
						<div className="py-10 text-center text-sm text-muted-foreground">
							{propertiesArray.length > 0 ? "Нет объектов с таким статусом" : (
								<>
									<p>Объекты не найдены</p>
									<button className="mt-2 text-blue-600 hover:underline" onClick={openCreate}>Добавить первый объект</button>
								</>
							)}
						</div>
					}
				/>
			</RentalQueryState>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{editing ? "Редактировать объект" : "Новый объект аренды"}</DialogTitle>
					</DialogHeader>

					{editing ? (
						<Tabs defaultValue="details">
							<TabsList className="w-full">
								<TabsTrigger value="details" className="flex-1">Данные</TabsTrigger>
								<TabsTrigger value="owners" className="flex-1">Владельцы</TabsTrigger>
							</TabsList>
							<TabsContent value="details">
								<div className="grid gap-3 py-2">
									<PropertyFormFields form={form} setField={setField} />
								</div>
								<div className="flex justify-between gap-2 pt-2">
									<Button type="button" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => editing && handleDelete(editing)}>
										<Trash2 className="w-4 h-4 mr-1" /> Удалить
									</Button>
									<div className="flex gap-2">
										<Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
										<Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
									</div>
								</div>
							</TabsContent>
							<TabsContent value="owners">
								<PropertyOwnersPanel propertyId={editing.id} />
							</TabsContent>
						</Tabs>
					) : (
						<>
							<div className="grid gap-3 py-2">
								<PropertyFormFields form={form} setField={setField} />
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
								<Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Добавить"}</Button>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
