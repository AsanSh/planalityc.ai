import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Lock, Plus, RotateCcw, Save, Search, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SystemSettingsBar } from "@/components/system-settings-nav";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Role {
	id: number;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

const PERMISSION_GROUPS = [
	{
		name: "Недвижимость",
		key: "properties",
		permissions: [
			{ key: "properties.read", label: "Просмотр объектов" },
			{ key: "properties.write", label: "Создание/изменение объектов" },
			{ key: "properties.delete", label: "Удаление объектов" },
		],
	},
	{
		name: "Пользователи",
		key: "users",
		permissions: [
			{ key: "users.read", label: "Просмотр пользователей" },
			{ key: "users.write", label: "Создание/изменение пользователей" },
			{ key: "users.delete", label: "Удаление пользователей" },
		],
	},
	{
		name: "Аренда",
		key: "rental",
		permissions: [
			{ key: "rental.read", label: "Просмотр договоров аренды" },
			{ key: "rental.write", label: "Создание/изменение договоров" },
			{ key: "rental.delete", label: "Удаление договоров" },
			{ key: "rental.payments", label: "Управление платежами" },
		],
	},
	{
		name: "Строительство",
		key: "construction",
		permissions: [
			{ key: "construction.read", label: "Просмотр проектов" },
			{ key: "construction.write", label: "Создание/изменение проектов" },
			{ key: "construction.delete", label: "Удаление проектов" },
			{ key: "construction.finance", label: "Финансы строительства" },
		],
	},
	{
		name: "Финансы",
		key: "finance",
		permissions: [
			{ key: "finance.read", label: "Просмотр финансов" },
			{ key: "finance.write", label: "Создание операций" },
			{ key: "finance.delete", label: "Удаление операций" },
			{ key: "finance.reports", label: "Финансовые отчеты" },
		],
	},
	{
		name: "Контрагенты",
		key: "counterparties",
		permissions: [
			{ key: "counterparties.read", label: "Просмотр контрагентов" },
			{ key: "counterparties.write", label: "Создание/изменение контрагентов" },
			{ key: "counterparties.delete", label: "Удаление контрагентов" },
		],
	},
	{
		name: "Настройки",
		key: "settings",
		permissions: [
			{ key: "settings.read", label: "Просмотр настроек" },
			{ key: "settings.write", label: "Изменение настроек" },
			{ key: "settings.roles", label: "Управление ролями" },
			{ key: "settings.legal_entities", label: "Управление юр. лицами" },
		],
	},
	{
		name: "Администрирование",
		key: "admin",
		permissions: [
			{ key: "admin.all", label: "Полный доступ администратора" },
			{ key: "admin.audit", label: "Просмотр логов" },
			{ key: "admin.backup", label: "Резервное копирование" },
		],
	},
];

const ACCESS_LEVELS = {
	full: {
		label: "Полный доступ",
		className: "border-emerald-200 bg-emerald-50 text-emerald-800",
	},
	read: {
		label: "Просмотр",
		className: "border-amber-200 bg-amber-50 text-amber-800",
	},
	none: {
		label: "Нет доступа",
		className: "border-rose-200 bg-rose-50 text-rose-800",
	},
} as const;

type AccessLevel = keyof typeof ACCESS_LEVELS;

interface MatrixRow {
	id: string;
	block: string;
	label: string;
	read: string[];
	full: string[];
}

const JOB_TITLES = [
	"Генеральный директор",
	"Исполнительный и Операционный директор",
	"Директор по строительству",
	"Главный бухгалтер",
	"Руководитель строительного проекта",
	"Коммерческий директор",
	"Финансовый директор",
	"Специалист по финансовым операциям",
	"Руководитель отдела аренды",
	"Специалист отдела аренды",
	"Руководитель отдела продаж",
	"Менеджер по продажам",
	"Инженер ПТО",
	"Специалист по снабжению",
	"Юрист",
	"Кассир",
];

const MATRIX_ROWS: MatrixRow[] = [
	{
		id: "core.overview",
		block: "Блок 1 · Дашборд компании",
		label: "Обзор",
		read: ["settings.read", "counterparties.read"],
		full: ["settings.write"],
	},
	{
		id: "core.users",
		block: "Блок 1 · Дашборд компании",
		label: "Пользователи и роли",
		read: ["users.read", "settings.read"],
		full: ["users.write", "users.delete", "settings.roles"],
	},
	{
		id: "construction.overview",
		block: "Блок 2 · Строительство",
		label: "Обзор",
		read: ["construction.read"],
		full: ["construction.write"],
	},
	{
		id: "construction.projects",
		block: "Блок 2 · Строительство",
		label: "Проекты",
		read: ["construction.projects.read", "construction.read"],
		full: ["construction.projects.write", "construction.write"],
	},
	{
		id: "construction.wbs",
		block: "Блок 2 · Строительство",
		label: "План проекта / этапы работ",
		read: ["construction.wbs.read", "construction.read"],
		full: ["construction.wbs.write", "construction.write"],
	},
	{
		id: "construction.tasks",
		block: "Блок 2 · Строительство",
		label: "Задачи",
		read: ["construction.tasks.read", "construction.read"],
		full: ["construction.tasks.write", "construction.write"],
	},
	{
		id: "construction.finance",
		block: "Блок 2 · Строительство",
		label: "Финансы",
		read: ["construction.finance.read", "finance.read"],
		full: ["construction.finance", "finance.write", "finance.reports"],
	},
	{
		id: "construction.resources",
		block: "Блок 2 · Строительство",
		label: "Ресурсы / аналитика",
		read: ["construction.analytics.read", "reports.read"],
		full: ["construction.analytics.write", "reports.write"],
	},
	{
		id: "rental.overview",
		block: "Блок 3 · Аренда",
		label: "Обзор",
		read: ["rental.read"],
		full: ["rental.write"],
	},
	{
		id: "rental.objects",
		block: "Блок 3 · Аренда",
		label: "Объекты",
		read: ["rental.objects.read", "rental.read"],
		full: ["rental.objects.write", "rental.write"],
	},
	{
		id: "rental.tenants",
		block: "Блок 3 · Аренда",
		label: "Арендаторы",
		read: ["rental.tenants.read", "counterparties.read"],
		full: ["rental.tenants.write", "counterparties.write"],
	},
	{
		id: "rental.contracts",
		block: "Блок 3 · Аренда",
		label: "Договоры и документы",
		read: ["rental.contracts.read", "rental.read"],
		full: ["rental.contracts.write", "rental.write"],
	},
	{
		id: "rental.finance",
		block: "Блок 3 · Аренда",
		label: "Финансы / аналитика",
		read: ["rental.finance.read", "finance.read"],
		full: ["rental.payments", "rental.write", "finance.write"],
	},
	{
		id: "crm.overview",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Обзор",
		read: ["properties.read"],
		full: ["properties.write"],
	},
	{
		id: "crm.chess",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Шахматка",
		read: ["properties.chess.read", "properties.read"],
		full: ["properties.chess.write", "properties.write"],
	},
	{
		id: "crm.leads",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Лиды",
		read: ["crm.leads.read", "properties.read"],
		full: ["crm.leads.write", "properties.write"],
	},
	{
		id: "crm.clients",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Покупатели / контрагенты",
		read: ["crm.clients.read", "counterparties.read"],
		full: ["crm.clients.write", "counterparties.write"],
	},
	{
		id: "crm.deals",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Сделки",
		read: ["crm.deals.read", "properties.read"],
		full: ["crm.deals.write", "properties.write"],
	},
	{
		id: "crm.contracts",
		block: "Блок 4 · CRM / продажа недвижимости",
		label: "Договоры и документы",
		read: ["crm.contracts.read", "properties.read"],
		full: ["crm.contracts.write", "properties.write"],
	},
	{
		id: "warehouse.overview",
		block: "Блок 5 · Снабжение",
		label: "Обзор",
		read: ["warehouse.read"],
		full: ["warehouse.write"],
	},
	{
		id: "warehouse.marketplace",
		block: "Блок 5 · Снабжение",
		label: "Маркетплейс",
		read: ["warehouse.marketplace.read", "warehouse.read"],
		full: ["warehouse.marketplace.write", "warehouse.write"],
	},
	{
		id: "warehouse.orders",
		block: "Блок 5 · Снабжение",
		label: "Заказы",
		read: ["warehouse.orders.read", "warehouse.read"],
		full: ["warehouse.orders.write", "warehouse.write"],
	},
	{
		id: "warehouse.requests",
		block: "Блок 5 · Снабжение",
		label: "Заявки / согласования",
		read: ["warehouse.requests.read", "warehouse.read"],
		full: ["warehouse.requests.write", "warehouse.write"],
	},
	{
		id: "warehouse.suppliers",
		block: "Блок 5 · Снабжение",
		label: "Поставщики / товары",
		read: ["warehouse.suppliers.read", "counterparties.read"],
		full: ["warehouse.suppliers.write", "counterparties.write", "warehouse.write"],
	},
];

const FULL_ACCESS_JOBS = new Set([
	"Генеральный директор",
	"Исполнительный и Операционный директор",
]);

function templateAccess(jobTitle: string, row: MatrixRow): AccessLevel {
	if (FULL_ACCESS_JOBS.has(jobTitle)) return "full";
	if (jobTitle === "Директор по строительству") {
		if (row.id.startsWith("construction.")) return "full";
		if (row.id.startsWith("warehouse.") || row.id.startsWith("crm.")) return "read";
		return row.id === "core.overview" ? "read" : "none";
	}
	if (jobTitle === "Руководитель строительного проекта") {
		if (["construction.overview", "construction.projects", "construction.wbs", "construction.tasks"].includes(row.id)) return "full";
		if (row.id === "construction.finance" || row.id.startsWith("warehouse.")) return "read";
		return row.id === "core.overview" ? "read" : "none";
	}
	if (jobTitle === "Инженер ПТО") {
		if (["construction.projects", "construction.wbs", "construction.tasks"].includes(row.id)) return "full";
		if (row.id === "construction.overview" || row.id === "construction.resources") return "read";
		return "none";
	}
	if (jobTitle === "Главный бухгалтер" || jobTitle === "Финансовый директор") {
		if (row.id.includes(".finance") || row.id === "core.overview") return "full";
		if (row.id.includes("contracts") || row.id.startsWith("construction.") || row.id.startsWith("rental.") || row.id.startsWith("crm.")) return "read";
		return "none";
	}
	if (jobTitle === "Специалист по финансовым операциям" || jobTitle === "Кассир") {
		if (row.id.includes(".finance")) return "full";
		if (row.id.includes("contracts") || row.id === "core.overview") return "read";
		return "none";
	}
	if (jobTitle === "Коммерческий директор") {
		if (row.id.startsWith("crm.") || row.id.startsWith("rental.")) return "full";
		if (row.id.startsWith("construction.")) return "read";
		return row.id === "core.overview" ? "read" : "none";
	}
	if (jobTitle === "Руководитель отдела аренды" || jobTitle === "Специалист отдела аренды") {
		if (row.id.startsWith("rental.")) return "full";
		if (row.id.startsWith("crm.") || row.id === "core.overview") return "read";
		return "none";
	}
	if (jobTitle === "Руководитель отдела продаж" || jobTitle === "Менеджер по продажам") {
		if (row.id.startsWith("crm.")) return "full";
		if (row.id === "construction.overview" || row.id === "construction.projects") return "read";
		return row.id === "core.overview" ? "read" : "none";
	}
	if (jobTitle === "Специалист по снабжению") {
		if (row.id.startsWith("warehouse.")) return "full";
		if (row.id === "construction.tasks" || row.id === "construction.wbs") return "read";
		return row.id === "core.overview" ? "read" : "none";
	}
	if (jobTitle === "Юрист") {
		if (row.id.includes("contracts")) return "full";
		if (row.id.startsWith("crm.") || row.id.startsWith("rental.") || row.id.startsWith("construction.")) return "read";
		return "none";
	}
	return "none";
}

function buildTemplateMatrix(jobTitles = JOB_TITLES) {
	return Object.fromEntries(
		jobTitles.map((jobTitle) => [
			jobTitle,
			Object.fromEntries(
				MATRIX_ROWS.map((row) => [row.id, templateAccess(jobTitle, row)]),
			) as Record<string, AccessLevel>,
		]),
	) as Record<string, Record<string, AccessLevel>>;
}

function roleAccessForRow(permissions: string[] = [], row: MatrixRow): AccessLevel {
	const hasFull = row.full.some((p) => permissions.includes(p));
	if (hasFull) return "full";
	const hasRead = [...row.read, ...row.full].some((p) => permissions.includes(p));
	return hasRead ? "read" : "none";
}

function permissionsFromMatrixRow(row: MatrixRow, level: AccessLevel) {
	if (level === "none") return [];
	if (level === "read") return row.read;
	return [...row.read, ...row.full];
}

function collectPermissionsForRole(rowAccess: Record<string, AccessLevel>) {
	const permissions = new Set<string>();
	MATRIX_ROWS.forEach((row) => {
		permissionsFromMatrixRow(row, rowAccess[row.id] ?? "none").forEach((permission) =>
			permissions.add(permission),
		);
	});
	return [...permissions].sort();
}

function accessSummary(rowAccess: Record<string, AccessLevel>) {
	return MATRIX_ROWS.reduce(
		(acc, row) => {
			const level = rowAccess[row.id] ?? "none";
			acc[level] += 1;
			return acc;
		},
		{ full: 0, read: 0, none: 0 } as Record<AccessLevel, number>,
	);
}

interface RoleDialogProps {
	open: boolean;
	onClose: () => void;
	role?: Role;
}

function RoleDialog({ open, onClose, role }: RoleDialogProps) {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		permissions: [] as string[],
		isActive: true,
	});

	useEffect(() => {
		if (role && open) {
			setFormData({
				name: role.name,
				description: role.description || "",
				permissions: role.permissions || [],
				isActive: role.isActive,
			});
		} else if (!role && open) {
			setFormData({
				name: "",
				description: "",
				permissions: [],
				isActive: true,
			});
		}
	}, [role, open]);

	const createMutation = useMutation({
		mutationFn: (data: any) => api.post("/roles", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль создана" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: any) => api.patch(`/roles/${role?.id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль обновлена" });
			onClose();
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = {
			name: formData.name,
			description: formData.description || null,
			permissions: formData.permissions,
			isActive: formData.isActive,
		};

		if (role) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const handlePermissionToggle = (permission: string) => {
		setFormData((prev) => ({
			...prev,
			permissions: prev.permissions.includes(permission)
				? prev.permissions.filter((p) => p !== permission)
				: [...prev.permissions, permission],
		}));
	};

	const handleGroupToggle = (groupKey: string) => {
		const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
		if (!group) return;

		const groupPermissions = group.permissions.map((p) => p.key);
		const allSelected = groupPermissions.every((p) =>
			formData.permissions.includes(p),
		);

		setFormData((prev) => ({
			...prev,
			permissions: allSelected
				? prev.permissions.filter((p) => !groupPermissions.includes(p))
				: [...new Set([...prev.permissions, ...groupPermissions])],
		}));
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const isSystemRole = role?.isSystem;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{role ? "Редактировать роль" : "Добавить роль"}
					</DialogTitle>
					{isSystemRole && (
						<p className="text-sm text-amber-600 flex items-center gap-1">
							<Lock className="w-3 h-3" />
							Системная роль - изменение ограничено
						</p>
					)}
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label>Название роли *</Label>
						<Input
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="Менеджер по аренде"
							required
							className="mt-1"
							disabled={isSystemRole}
						/>
					</div>

					<div>
						<Label>Описание</Label>
						<Textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="Краткое описание роли и её обязанностей"
							className="mt-1"
							rows={2}
						/>
					</div>

					<div>
						<Label className="text-base font-semibold">Права доступа</Label>
						<p className="text-sm text-gray-500 mb-3">
							Выберите разрешения для этой роли
						</p>

						<div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
							{PERMISSION_GROUPS.map((group) => {
								const groupPermissions = group.permissions.map((p) => p.key);
								const selectedCount = groupPermissions.filter((p) =>
									formData.permissions.includes(p),
								).length;
								const allSelected = selectedCount === groupPermissions.length;
								const someSelected = selectedCount > 0 && !allSelected;

								return (
									<div key={group.key} className="space-y-2">
										<div className="flex items-center gap-2 font-medium text-sm">
											<Checkbox
												checked={allSelected}
												onCheckedChange={() => handleGroupToggle(group.key)}
												className={cn(
													someSelected && "data-[state=checked]:bg-gray-400",
												)}
											/>
											<span className="text-gray-900">{group.name}</span>
											{selectedCount > 0 && (
												<Badge variant="secondary" className="text-xs">
													{selectedCount}/{groupPermissions.length}
												</Badge>
											)}
										</div>
										<div className="ml-6 space-y-2">
											{group.permissions.map((permission) => (
												<div
													key={permission.key}
													className="flex items-center gap-2"
												>
													<Checkbox
														checked={formData.permissions.includes(
															permission.key,
														)}
														onCheckedChange={() =>
															handlePermissionToggle(permission.key)
														}
													/>
													<span className="text-sm text-gray-600">
														{permission.label}
													</span>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						<p className="text-xs text-gray-500 mt-2">
							Выбрано разрешений: {formData.permissions.length}
						</p>
					</div>

					<div className="flex items-center space-x-2">
						<Switch
							id="isActive"
							checked={formData.isActive}
							onCheckedChange={(checked) =>
								setFormData({ ...formData, isActive: checked })
							}
						/>
						<Label htmlFor="isActive" className="cursor-pointer">
							Активна
						</Label>
					</div>

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

function AccessMatrix({
	roles,
}: {
	roles: Role[];
}) {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [jobTitles, setJobTitles] = useState<string[]>(JOB_TITLES);
	const [newJobTitle, setNewJobTitle] = useState("");
	const [selectedJob, setSelectedJob] = useState(JOB_TITLES[0]);
	const [selectedBlock, setSelectedBlock] = useState(MATRIX_ROWS[0].block);
	const [dirty, setDirty] = useState(false);
	const [matrix, setMatrix] = useState<Record<string, Record<string, AccessLevel>>>(
		() => buildTemplateMatrix(),
	);

	const roleByName = useMemo(() => {
		return new Map(
			roles.map((role) => [role.name.trim().toLowerCase(), role]),
		);
	}, [roles]);

	useEffect(() => {
		if (dirty) return;
		setMatrix((current) => {
			const next = buildTemplateMatrix(jobTitles);
			for (const jobTitle of jobTitles) {
				const existing = roleByName.get(jobTitle.trim().toLowerCase());
				if (!existing) {
					next[jobTitle] = current[jobTitle] ?? next[jobTitle];
					continue;
				}
				next[jobTitle] = Object.fromEntries(
					MATRIX_ROWS.map((row) => [
						row.id,
						roleAccessForRow(existing.permissions, row),
					]),
				) as Record<string, AccessLevel>;
			}
			return next;
		});
	}, [dirty, jobTitles, roleByName]);

	const groupedRows = useMemo(() => {
		const groups = new Map<string, MatrixRow[]>();
		for (const row of MATRIX_ROWS) {
			const rows = groups.get(row.block) ?? [];
			rows.push(row);
			groups.set(row.block, rows);
		}
		return [...groups.entries()];
	}, []);

	const blockRows = useMemo(
		() => MATRIX_ROWS.filter((row) => row.block === selectedBlock),
		[selectedBlock],
	);

	useEffect(() => {
		if (!jobTitles.includes(selectedJob)) {
			setSelectedJob(jobTitles[0] ?? "");
		}
	}, [jobTitles, selectedJob]);

	const saveMatrixMutation = useMutation({
		mutationFn: async () => {
			for (const jobTitle of jobTitles) {
				const permissions = collectPermissionsForRole(matrix[jobTitle] ?? {});
				const payload = {
					name: jobTitle,
					description: "Матрица доступов по должности",
					permissions,
					isActive: true,
				};
				const existing = roleByName.get(jobTitle.trim().toLowerCase());
				if (existing) {
					await api.patch(`/roles/${existing.id}`, payload);
				} else {
					await api.post("/roles", payload);
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			queryClient.invalidateQueries({ queryKey: ["company-roles"] });
			setDirty(false);
			toast({ title: "Матрица доступов сохранена" });
		},
		onError: (error: any) => {
			toast({
				title: "Не удалось сохранить матрицу",
				description: error?.message || "Проверьте доступ к настройкам ролей",
				variant: "destructive",
			});
		},
	});

	const setAccess = (jobTitle: string, rowId: string, value: AccessLevel) => {
		setDirty(true);
		setMatrix((current) => ({
			...current,
			[jobTitle]: {
				...(current[jobTitle] ?? {}),
				[rowId]: value,
			},
		}));
	};

	const setColumnAccess = (jobTitle: string, value: AccessLevel) => {
		setDirty(true);
		setMatrix((current) => ({
			...current,
			[jobTitle]: Object.fromEntries(
				MATRIX_ROWS.map((row) => [row.id, value]),
			) as Record<string, AccessLevel>,
		}));
	};

	const setBlockAccess = (jobTitle: string, value: AccessLevel) => {
		setDirty(true);
		setMatrix((current) => {
			const nextRole = { ...(current[jobTitle] ?? {}) };
			blockRows.forEach((row) => {
				nextRole[row.id] = value;
			});
			return {
				...current,
				[jobTitle]: nextRole,
			};
		});
	};

	const addJobTitle = () => {
		const title = newJobTitle.trim();
		if (!title || jobTitles.some((job) => job.toLowerCase() === title.toLowerCase())) return;
		setJobTitles((current) => [...current, title]);
		setMatrix((current) => ({
			...current,
			[title]: Object.fromEntries(
				MATRIX_ROWS.map((row) => [row.id, "none"]),
			) as Record<string, AccessLevel>,
		}));
		setSelectedJob(title);
		setNewJobTitle("");
		setDirty(true);
	};

	const resetTemplate = () => {
		setJobTitles(JOB_TITLES);
		setMatrix(buildTemplateMatrix());
		setDirty(true);
	};

	const selectedSummary = accessSummary(matrix[selectedJob] ?? {});
	const blockSummary = blockRows.reduce(
		(acc, row) => {
			const level = matrix[selectedJob]?.[row.id] ?? "none";
			acc[level] += 1;
			return acc;
		},
		{ full: 0, read: 0, none: 0 } as Record<AccessLevel, number>,
	);

	return (
		<section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
			<div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-br from-white to-cyan-50/60 p-5 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
						Матрица доступа
					</p>
					<h2 className="mt-1 text-xl font-bold text-slate-950">
						Должности и права по разделам
					</h2>
					<p className="mt-1 max-w-3xl text-sm text-slate-600">
						Выберите должность, настройте блоки доступа и сохраните. Должности
						после сохранения доступны в карточке сотрудника.
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
					<Input
						value={newJobTitle}
						onChange={(event) => setNewJobTitle(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								addJobTitle();
							}
						}}
						placeholder="Новая должность"
						className="h-10 sm:w-56"
					/>
					<Button type="button" variant="outline" onClick={addJobTitle}>
						<Plus className="mr-2 h-4 w-4" />
						Добавить
					</Button>
					<Button type="button" variant="outline" onClick={resetTemplate}>
						<RotateCcw className="mr-2 h-4 w-4" />
						Шаблон
					</Button>
					<Button
						type="button"
						onClick={() => saveMatrixMutation.mutate()}
						disabled={saveMatrixMutation.isPending}
						className="bg-cyan-700 hover:bg-cyan-800"
					>
						<Save className="mr-2 h-4 w-4" />
						{saveMatrixMutation.isPending ? "Сохранение..." : "Сохранить матрицу"}
					</Button>
				</div>
			</div>

			<div className="grid gap-0 xl:grid-cols-[320px_1fr]">
				<aside className="border-b border-slate-200 bg-slate-50/70 p-4 xl:border-b-0 xl:border-r">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
								Должности
							</p>
							<p className="text-sm text-slate-600">{jobTitles.length} ролей в матрице</p>
						</div>
						{dirty && (
							<span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
								Не сохранено
							</span>
						)}
					</div>

					<div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
						{jobTitles.map((jobTitle) => {
							const summary = accessSummary(matrix[jobTitle] ?? {});
							const active = jobTitle === selectedJob;
							return (
								<button
									key={jobTitle}
									type="button"
									onClick={() => setSelectedJob(jobTitle)}
									className={cn(
										"w-full rounded-2xl border bg-white p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/50",
										active && "border-cyan-400 bg-cyan-50 shadow-sm",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<p className="text-sm font-bold leading-snug text-slate-950">
											{jobTitle}
										</p>
										<span
											className={cn(
												"mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
												active ? "bg-cyan-600" : "bg-slate-300",
											)}
										/>
									</div>
									<div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
										<span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
											{summary.full} полн.
										</span>
										<span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
											{summary.read} просм.
										</span>
										<span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
											{summary.none} нет
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</aside>

				<div className="min-w-0 p-4">
					<div className="mb-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
						<div className="min-w-0">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
								Настройка роли
							</p>
							<h3 className="mt-1 truncate text-2xl font-bold text-slate-950">
								{selectedJob}
							</h3>
							<div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
								<span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
									Полный доступ: {selectedSummary.full}
								</span>
								<span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
									Просмотр: {selectedSummary.read}
								</span>
								<span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
									Нет доступа: {selectedSummary.none}
								</span>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							{Object.entries(ACCESS_LEVELS).map(([key, item]) => (
								<Button
									key={key}
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setColumnAccess(selectedJob, key as AccessLevel)}
									className={cn("rounded-full border font-bold", item.className)}
								>
									Везде: {item.label}
								</Button>
							))}
						</div>
					</div>

					<div className="mb-4 overflow-x-auto">
						<div className="flex min-w-max gap-2">
							{groupedRows.map(([block, rows]) => {
								const active = block === selectedBlock;
								return (
									<button
										key={block}
										type="button"
										onClick={() => setSelectedBlock(block)}
										className={cn(
											"rounded-2xl border px-4 py-3 text-left text-sm transition",
											active
												? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-sm"
												: "border-slate-200 bg-white text-slate-600 hover:border-cyan-200",
										)}
									>
										<span className="block font-bold">{block}</span>
										<span className="mt-1 block text-xs text-slate-500">
											{rows.length} разделов
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
						<div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
									{selectedBlock}
								</p>
								<p className="mt-1 text-sm text-slate-600">
									{blockRows.length} разделов · полный {blockSummary.full} · просмотр {blockSummary.read} · запрет {blockSummary.none}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{Object.entries(ACCESS_LEVELS).map(([key, item]) => (
									<Button
										key={key}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setBlockAccess(selectedJob, key as AccessLevel)}
										className={cn("rounded-full border font-bold", item.className)}
									>
										Блок: {item.label}
									</Button>
								))}
							</div>
						</div>

						<div className="divide-y divide-slate-100">
							{blockRows.map((row) => {
								const value = matrix[selectedJob]?.[row.id] ?? "none";
								return (
									<div
										key={row.id}
										className="grid gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1fr)_auto]"
									>
										<div className="min-w-0">
											<p className="font-bold text-slate-950">{row.label}</p>
											<p className="mt-1 text-xs text-slate-500">
												{row.read.length + row.full.length} технических разрешений
											</p>
										</div>
										<div className="grid grid-cols-3 gap-2 sm:w-[480px]">
											{Object.entries(ACCESS_LEVELS).map(([key, item]) => {
												const active = value === key;
												return (
													<button
														key={key}
														type="button"
														onClick={() =>
															setAccess(selectedJob, row.id, key as AccessLevel)
														}
														className={cn(
															"min-h-10 rounded-full border px-3 text-xs font-bold transition",
															active
																? item.className
																: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
														)}
													>
														{item.label}
													</button>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			<div className="border-t border-slate-100 px-5 py-3">
				<div className="flex flex-wrap gap-2 text-xs">
					{Object.entries(ACCESS_LEVELS).map(([key, item]) => (
						<span
							key={key}
							className={cn("rounded-full border px-3 py-1 font-semibold", item.className)}
						>
							{item.label}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}

export default function Roles() {
	const [search, setSearch] = useState("");
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const { data: roles, isLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedRole, setSelectedRole] = useState<Role | undefined>();
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/roles/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			toast({ title: "Роль удалена" });
		},
		onError: (error: any) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleDelete = async () => {
		if (!deleteId) return;
		deleteMutation.mutate(deleteId);
		setDeleteId(null);
	};

	const rolesArray = Array.isArray(roles) ? roles : [];
	const filtered = rolesArray.filter((role: Role) => {
		if (!search) return true;
		const searchLower = search.toLowerCase();
		return (
			role.name.toLowerCase().includes(searchLower) ||
			role.description?.toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="space-y-5">
			<SystemSettingsBar />
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Shield className="w-6 h-6 text-blue-600" /> Роли и разрешения
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Управление ролями пользователей и правами доступа
					</p>
				</div>
				<Button
					onClick={() => {
						setSelectedRole(undefined);
						setDialogOpen(true);
					}}
				>
					<Plus className="w-4 h-4 mr-2" /> Добавить
				</Button>
			</div>

			<div className="flex gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" />
					<Input
						placeholder="Поиск по названию или описанию..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<AccessMatrix roles={rolesArray} />

			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead>Название роли</TableHead>
							<TableHead>Описание</TableHead>
							<TableHead>Разрешений</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead className="w-20"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : !filtered.length ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-12">
									<Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
									<p className="text-gray-600">Роли не найдены</p>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((role: Role) => (
								<TableRow key={role.id} className="hover:bg-gray-50">
									<TableCell className="font-medium text-gray-900">
										<div className="flex items-center gap-2">
											{role.isSystem && (
												<Lock className="w-3 h-3 text-amber-600" />
											)}
											{role.name}
										</div>
									</TableCell>
									<TableCell className="text-gray-600 text-sm max-w-md truncate">
										{role.description || "—"}
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{role.permissions?.length || 0}
										</Badge>
									</TableCell>
									<TableCell>
										{role.isSystem ? (
											<Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
												Системная
											</Badge>
										) : (
											<Badge variant="secondary">Пользовательская</Badge>
										)}
									</TableCell>
									<TableCell>
										<Badge variant={role.isActive ? "default" : "secondary"}>
											{role.isActive ? "Активна" : "Неактивна"}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setSelectedRole(role);
													setDialogOpen(true);
												}}
											>
												<Edit2 className="w-4 h-4" />
											</Button>
											{!role.isSystem && (
												<Button
													variant="ghost"
													size="icon"
													className="text-rose-600 hover:text-rose-700"
													onClick={() => setDeleteId(role.id)}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<RoleDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				role={selectedRole}
			/>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(v) => !v && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить роль?</AlertDialogTitle>
						<AlertDialogDescription>
							Это действие нельзя отменить. Роль будет удалена из системы.
							Убедитесь, что эта роль не назначена пользователям.
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
