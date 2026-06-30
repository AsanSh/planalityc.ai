import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, FileX, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { LeaseContract } from "@/api-client";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format-currency";
import {
	fmtLeaseAmount,
	fmtLeaseDate,
	leaseStatusColors,
	leaseStatusLabels,
} from "@/components/rental/lease-dialogs";

export type LeaseContractRow = LeaseContract & {
	tenantPhone?: string | null;
	tenantEmail?: string | null;
	tenantIin?: string | null;
	propertyBlock?: string | null;
	propertyFloor?: number | null;
	propertyFullAddress?: string | null;
	propertyProjectName?: string | null;
	propertyRentalStatus?: string | null;
	gracePeriodDays?: number | null;
	discountType?: string | null;
	discountValue?: number | string | null;
	discountReason?: string | null;
	utilitiesMode?: string | null;
	companyId?: number | null;
};

const propertyRentalStatusLabels: Record<string, string> = {
	free: "Свободен",
	rented: "Сдан",
};

const utilitiesModeLabels: Record<string, string> = {
	included: "Включены в аренду",
	separate: "Отдельно",
	fixed: "Фиксированная сумма",
};

const discountTypeLabels: Record<string, string> = {
	percent: "Процент",
	fixed: "Сумма",
};

function fmtDateTime(value: string | null | undefined) {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("ru-RU");
}

function formatDiscount(row: LeaseContractRow) {
	const type = row.discountType;
	const value = row.discountValue;
	if (!type || value == null || value === "") return "—";
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (Number.isNaN(num)) return "—";
	if (type === "percent") return `${num}%`;
	return formatCurrency(num, row.currency);
}

interface LeaseContractsTableProps {
	data: LeaseContractRow[];
	isLoading?: boolean;
	activeCount: number;
	totalRent: number;
	onEdit: (lease: LeaseContract) => void;
	onRecalc: (lease: LeaseContract) => void;
	onTerminate: (lease: LeaseContract) => void;
	onStructuredTerminate?: (lease: LeaseContract) => void;
	onDelete: (lease: LeaseContract) => void;
}

export function LeaseContractsTable({
	data,
	isLoading,
	activeCount,
	totalRent,
	onEdit,
	onRecalc,
	onTerminate,
	onStructuredTerminate,
	onDelete,
}: LeaseContractsTableProps) {
	const columns = useMemo<ColumnDef<LeaseContractRow, unknown>[]>(
		() => [
			{
				accessorKey: "contractNumber",
				header: "№ договора",
				size: 140,
				meta: { exportLabel: "№ договора", pinned: "left" },
				cell: ({ row }) => (
					<span className="font-medium">{row.original.contractNumber}</span>
				),
			},
			{
				id: "propertyFullAddress",
				header: "Объект",
				size: 240,
				accessorFn: (row) =>
					row.propertyFullAddress ||
					row.propertyUnitNumber ||
					`#${row.propertyId}`,
				meta: { exportLabel: "Объект", grow: true },
				cell: ({ row }) => {
					const label =
						row.original.propertyFullAddress ||
						row.original.propertyUnitNumber ||
						`#${row.original.propertyId}`;
					return (
						<span className="text-sm leading-snug" title={label}>
							{label}
						</span>
					);
				},
			},
			{
				id: "propertyBlock",
				header: "Блок",
				size: 100,
				accessorFn: (row) => row.propertyBlock || "—",
				meta: { exportLabel: "Блок" },
			},
			{
				id: "propertyRentalStatus",
				header: "Статус объекта",
				size: 130,
				accessorFn: (row) =>
					propertyRentalStatusLabels[row.propertyRentalStatus || ""] ||
					row.propertyRentalStatus ||
					"—",
				meta: { exportLabel: "Статус объекта" },
				cell: ({ row }) => {
					const status = row.original.propertyRentalStatus;
					if (!status) return "—";
					const label = propertyRentalStatusLabels[status] || status;
					const cls =
						status === "rented"
							? "bg-emerald-100 text-emerald-700 border-emerald-200"
							: "bg-gray-100 text-gray-600 border-gray-200";
					return (
						<Badge variant="outline" className={cls}>
							{label}
						</Badge>
					);
				},
			},
			{
				id: "tenantName",
				header: "Арендатор",
				size: 180,
				accessorFn: (row) => row.tenantName || `#${row.tenantId}`,
				meta: { exportLabel: "Арендатор", grow: true },
			},
			{
				id: "tenantPhone",
				header: "Телефон",
				size: 140,
				accessorFn: (row) => row.tenantPhone || "—",
				meta: { exportLabel: "Телефон арендатора" },
			},
			{
				id: "tenantEmail",
				header: "Email",
				size: 180,
				accessorFn: (row) => row.tenantEmail || "—",
				meta: { exportLabel: "Email арендатора" },
			},
			{
				id: "tenantIin",
				header: "ИИН",
				size: 130,
				accessorFn: (row) => row.tenantIin || "—",
				meta: { exportLabel: "ИИН арендатора" },
			},
			{
				accessorKey: "signDate",
				header: "Подписание",
				size: 110,
				meta: { exportLabel: "Дата подписания" },
				cell: ({ row }) => fmtLeaseDate(row.original.signDate),
			},
			{
				accessorKey: "startDate",
				header: "Начало начислений",
				size: 130,
				meta: { exportLabel: "Начало начислений" },
				cell: ({ row }) => fmtLeaseDate(row.original.startDate),
			},
			{
				accessorKey: "endDate",
				header: "Завершение",
				size: 120,
				meta: { exportLabel: "Дата завершения" },
				cell: ({ row }) =>
					row.original.endDate ? fmtLeaseDate(row.original.endDate) : "бессрочный",
			},
			{
				accessorKey: "rentAmount",
				header: "Аренда/мес.",
				size: 130,
				meta: { exportLabel: "Аренда/мес.", align: "right", financeAmount: true },
				cell: ({ row }) => (
					<span className="font-medium tabular-nums">
						{fmtLeaseAmount(row.original.rentAmount, row.original.currency)}
					</span>
				),
			},
			{
				accessorKey: "currency",
				header: "Валюта",
				size: 80,
				meta: { exportLabel: "Валюта" },
			},
			{
				accessorKey: "depositAmount",
				header: "Депозит",
				size: 120,
				meta: { exportLabel: "Депозит", align: "right", financeAmount: true },
				cell: ({ row }) =>
					row.original.depositAmount != null
						? fmtLeaseAmount(row.original.depositAmount, row.original.currency)
						: "—",
			},
			{
				accessorKey: "accrualDay",
				header: "День начисления",
				size: 120,
				meta: { exportLabel: "День начисления", align: "right" },
				cell: ({ row }) => row.original.accrualDay ?? "—",
			},
			{
				accessorKey: "status",
				header: "Статус",
				size: 120,
				meta: { exportLabel: "Статус договора" },
				cell: ({ row }) => (
					<Badge
						variant="secondary"
						className={leaseStatusColors[row.original.status]}
					>
						{leaseStatusLabels[row.original.status] || row.original.status}
					</Badge>
				),
			},
			{
				accessorKey: "comment",
				header: "Комментарий",
				size: 200,
				meta: { exportLabel: "Комментарий", grow: true, truncate: true },
				cell: ({ row }) => row.original.comment || "—",
			},
			{
				id: "gracePeriodDays",
				header: "Льготный период",
				size: 120,
				accessorFn: (row) => row.gracePeriodDays ?? 0,
				meta: { exportLabel: "Льготный период (дней)", align: "right" },
				cell: ({ row }) => row.original.gracePeriodDays ?? 0,
			},
			{
				id: "discountType",
				header: "Тип скидки",
				size: 110,
				accessorFn: (row) =>
					discountTypeLabels[row.discountType || ""] || row.discountType || "—",
				meta: { exportLabel: "Тип скидки" },
			},
			{
				id: "discountValue",
				header: "Скидка",
				size: 110,
				accessorFn: (row) => formatDiscount(row),
				meta: { exportLabel: "Скидка", align: "right" },
				cell: ({ row }) => formatDiscount(row.original),
			},
			{
				id: "discountReason",
				header: "Причина скидки",
				size: 160,
				accessorFn: (row) => row.discountReason || "—",
				meta: { exportLabel: "Причина скидки", truncate: true },
			},
			{
				id: "utilitiesMode",
				header: "Коммунальные",
				size: 150,
				accessorFn: (row) =>
					utilitiesModeLabels[row.utilitiesMode || ""] || row.utilitiesMode || "—",
				meta: { exportLabel: "Коммунальные услуги" },
			},
			{
				accessorKey: "propertyId",
				header: "ID объекта",
				size: 100,
				meta: { exportLabel: "ID объекта", align: "right" },
			},
			{
				accessorKey: "tenantId",
				header: "ID арендатора",
				size: 110,
				meta: { exportLabel: "ID арендатора", align: "right" },
			},
			{
				id: "companyId",
				header: "ID компании",
				size: 110,
				accessorFn: (row) => row.companyId ?? "—",
				meta: { exportLabel: "ID компании", align: "right" },
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
				id: "actions",
				header: "",
				size: 56,
				enableSorting: false,
				meta: { pinned: "right", align: "center" },
				cell: ({ row }) => {
					const lease = row.original;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<ChevronDown className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => onEdit(lease)}>
									<Pencil className="mr-2 h-4 w-4" />
									Редактировать
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onRecalc(lease)}>
									<RefreshCw className="mr-2 h-4 w-4" />
									Пересчитать начисления
								</DropdownMenuItem>
								{(lease.status === "active" || lease.status === "expired") && (
									<DropdownMenuItem onClick={() => onTerminate(lease)}>
										<FileX className="mr-2 h-4 w-4" />
										Расторгнуть
									</DropdownMenuItem>
								)}
								{(lease.status === "active" || lease.status === "expired") &&
									onStructuredTerminate && (
										<DropdownMenuItem
											onClick={() => onStructuredTerminate(lease)}
										>
											<FileX className="mr-2 h-4 w-4" />
											Расторгнуть договор (детально)
										</DropdownMenuItem>
									)}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-rose-600 focus:text-rose-600"
									onClick={() => onDelete(lease)}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Удалить
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[onDelete, onEdit, onRecalc, onStructuredTerminate, onTerminate],
	);

	return (
		<DataTable
			tableId="rental-contracts"
			columns={columns}
			data={data}
			isLoading={isLoading}
			maxHeight="calc(100vh - 320px)"
			enableSearch
			searchPlaceholder="Поиск по номеру, объекту, арендатору…"
			initialSorting={[{ id: "contractNumber", desc: false }]}
			emptyState="Договоры аренды не найдены"
			footer={
				!isLoading && data.length > 0 ? (
					<tr className="border-t-2 bg-gray-50 font-semibold">
						<td colSpan={columns.length} className="px-3 py-2 text-sm text-gray-600">
							Итого: {data.length} договоров · активных: {activeCount} · суммарная
							аренда: {formatCurrency(totalRent)}
						</td>
					</tr>
				) : undefined
			}
		/>
	);
}
