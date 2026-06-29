import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

// Создавать/редактировать/удалять проект могут только директора и админы
export const PROJECT_EDITOR_ROLES = [
	"super_admin",
	"admin",
	"company_admin",
	"owner",
	"general_director",
	"executive_operations_director",
	"construction_director",
	"commercial_director",
	"financial_director",
];

export function canEditProject(role?: string | null): boolean {
	return !!role && PROJECT_EDITOR_ROLES.includes(role);
}

export const MATRIX_JOB_ROLES = [
	{ value: "general_director", label: "Генеральный директор" },
	{ value: "executive_operations_director", label: "Исполнительный и Операционный директор" },
	{ value: "construction_director", label: "Директор по строительству" },
	{ value: "chief_accountant", label: "Главный бухгалтер" },
	{ value: "construction_project_manager", label: "Руководитель строительного проекта" },
	{ value: "commercial_director", label: "Коммерческий директор" },
	{ value: "financial_director", label: "Финансовый директор" },
	{ value: "finance_operations_specialist", label: "Специалист по финансовым операциям" },
	{ value: "rental_department_head", label: "Руководитель отдела аренды" },
	{ value: "rental_specialist", label: "Специалист отдела аренды" },
	{ value: "sales_department_head", label: "Руководитель отдела продаж" },
	{ value: "sales_manager", label: "Менеджер по продажам" },
	{ value: "pto_engineer", label: "Инженер ПТО" },
	{ value: "supply_specialist", label: "Специалист по снабжению" },
	{ value: "lawyer", label: "Юрист" },
	{ value: "cashier", label: "Кассир" },
] as const;

export const MATRIX_JOB_LABELS = Object.fromEntries(
	MATRIX_JOB_ROLES.map((role) => [role.value, role.label]),
) as Record<string, string>;

export const SYSTEM_ROLE_LABELS: Record<string, string> = {
	admin: "Администратор",
	super_admin: "Супер-Админ",
	company_admin: "Администратор компании",
	rental_manager: "Менеджер аренды",
	finance: "Финансы",
	staff: "Сотрудник",
	pto: "ПТО (управление площадями)",
	engineer: "Инженер ПТО",
	...MATRIX_JOB_LABELS,
};

export interface CompanyRole {
	id: number;
	name: string;
	description?: string | null;
	permissions?: string[];
	isActive: boolean;
}

const ROLE_ACCESS_FALLBACK: Record<string, string[]> = {
	general_director: ["Свод", "Стройка", "Аренда", "CRM", "Снабжение", "Настройки"],
	executive_operations_director: ["Свод", "Стройка", "Аренда", "CRM", "Снабжение"],
	construction_director: ["Стройка", "ПТО", "Задачи", "Отчёты"],
	chief_accountant: ["Финансы", "Отчёты", "Контрагенты"],
	construction_project_manager: ["Стройка", "Проекты", "WBS", "Задачи"],
	commercial_director: ["CRM", "Продажи", "Контрагенты", "Отчёты"],
	financial_director: ["Финансы", "Бюджет", "Отчёты", "Свод"],
	finance_operations_specialist: ["Операции", "Платежи", "Начисления"],
	rental_department_head: ["Аренда", "Договоры", "Финансы аренды", "Отчёты"],
	rental_specialist: ["Аренда", "Объекты", "Арендаторы", "Договоры"],
	sales_department_head: ["CRM", "Шахматка", "Сделки", "Контрагенты"],
	sales_manager: ["CRM", "Лиды", "Сделки", "Шахматка"],
	pto_engineer: ["ПТО", "Шахматка", "Площади", "Документы"],
	supply_specialist: ["Снабжение", "Заявки", "Заказы", "Поставщики"],
	lawyer: ["Договоры", "Документы", "Согласование"],
	cashier: ["Касса", "Приём платежей", "История платежей"],
};

const PERMISSION_MODULE_LABELS: Array<[string, string]> = [
	["construction.", "Стройка"],
	["rental.", "Аренда"],
	["crm.", "CRM"],
	["warehouse.", "Снабжение"],
	["finance.", "Финансы"],
	["users.", "Сотрудники"],
	["settings.", "Настройки"],
	["counterparties.", "Контрагенты"],
	["reports.", "Отчёты"],
	["admin.", "Администрирование"],
];

export function customRoleValue(id: number): string {
	return `custom_${id}`;
}

export function parseCustomRoleId(role: string): number | null {
	const match = /^custom_(\d+)$/.exec(role);
	return match ? parseInt(match[1], 10) : null;
}

export function resolveRoleLabel(
	role: string,
	customRoles?: CompanyRole[],
): string {
	if (SYSTEM_ROLE_LABELS[role]) return SYSTEM_ROLE_LABELS[role];
	const id = parseCustomRoleId(role);
	if (id && customRoles) {
		const found = customRoles.find((r) => r.id === id);
		if (found) return found.name;
	}
	return role;
}

export function useCompanyRoles() {
	return useQuery<CompanyRole[]>({
		queryKey: ["company-roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
	});
}

function findMatrixRole(role: string, companyRoles: CompanyRole[] = []) {
	const label = MATRIX_JOB_LABELS[role] ?? role;
	const normalizedLabel = label.trim().toLowerCase();
	const normalizedRole = role.trim().toLowerCase();
	return companyRoles.find((item) => {
		const name = item.name.trim().toLowerCase();
		return name === normalizedLabel || name === normalizedRole;
	});
}

export function getRoleAccessPreview(role: string, companyRoles: CompanyRole[] = []) {
	const label = MATRIX_JOB_LABELS[role] ?? resolveRoleLabel(role, companyRoles);
	const matrixRole = findMatrixRole(role, companyRoles);
	const permissions = Array.isArray(matrixRole?.permissions) ? matrixRole.permissions : [];
	const modules = permissions.length
		? [
				...new Set(
					permissions.map((permission) => {
						const match = PERMISSION_MODULE_LABELS.find(([prefix]) =>
							permission.startsWith(prefix),
						);
						return match?.[1] ?? "Другое";
					}),
				),
			].slice(0, 6)
		: (ROLE_ACCESS_FALLBACK[role] ?? ["Доступ задаётся в матрице"]);

	return {
		label,
		isSavedTemplate: Boolean(matrixRole),
		permissionsCount: permissions.length,
		modules,
	};
}

export function RoleAccessPreview({
	role,
	companyRoles = [],
	className,
}: {
	role: string;
	companyRoles?: CompanyRole[];
	className?: string;
}) {
	const preview = getRoleAccessPreview(role, companyRoles);

	return (
		<div className={`rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 ${className ?? ""}`}>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-700">
						Доступ по должности
					</p>
					<p className="mt-1 text-sm font-semibold text-slate-900">{preview.label}</p>
				</div>
				<Badge
					variant="outline"
					className="rounded-full border-cyan-200 bg-white text-[11px] text-cyan-800"
				>
					{preview.isSavedTemplate
						? `${preview.permissionsCount} разреш.`
						: "Шаблон"}
				</Badge>
			</div>
			<div className="mt-3 flex flex-wrap gap-1.5">
				{preview.modules.map((module) => (
					<span
						key={module}
						className="rounded-full border border-white bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-700"
					>
						{module}
					</span>
				))}
			</div>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-100 pt-2">
				<p className="text-xs text-slate-600">
					Права берутся из шаблона должности в матрице.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 rounded-full bg-white px-3 text-xs"
					onClick={() => {
						window.location.href = "/settings/roles";
					}}
				>
					Настроить индивидуально
				</Button>
			</div>
		</div>
	);
}

export function RoleSelect({
	value,
	onValueChange,
	className,
}: {
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder="Выберите роль" />
			</SelectTrigger>
			<SelectContent>
				{MATRIX_JOB_ROLES.map((role) => (
					<SelectItem key={role.value} value={role.value}>
						{role.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
