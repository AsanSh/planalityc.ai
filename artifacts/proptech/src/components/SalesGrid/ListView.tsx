import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Tablo } from "@/components/am";
import { Badge } from "@/components/ui/badge";
import {
	formatPriceSom,
	resolvedPricePerSqm,
	resolvedTotalPrice,
} from "@/lib/unit-pricing";
import { badgeCfgFor, type StatusBadgeCfg } from "@/lib/unit-statuses";
import { EditableAreaCell } from "./EditableAreaCell";
import type { SalesGridUnit } from "./types";

const UNIT_TYPE_LABELS: Record<string, string> = {
	apartment: "Квартира",
	studio: "Студия",
	office: "Офис",
	commercial: "Коммерческое",
	parking: "Паркинг",
	storage: "Кладовая",
};

export function ListView({
	units,
	statusBadgeMap,
	onSelect,
	canEditArea,
	onAreaSave,
}: {
	units: SalesGridUnit[];
	statusBadgeMap: Record<string, StatusBadgeCfg>;
	onSelect: (u: SalesGridUnit) => void;
	canEditArea?: boolean;
	onAreaSave?: (unit: SalesGridUnit, area: number) => Promise<void>;
}) {
	const columns = useMemo<ColumnDef<SalesGridUnit>[]>(
		() => [
			{
				id: "unitNumber",
				header: "№",
				accessorKey: "unitNumber",
				cell: ({ row }) => (
					<button
						type="button"
						className="font-semibold text-slate-900 hover:underline"
						onClick={() => onSelect(row.original)}
					>
						{row.original.unitNumber}
					</button>
				),
			},
			{
				id: "floor",
				header: "Этаж",
				accessorFn: (r) => r.floor ?? "—",
			},
			{
				id: "block",
				header: "Секция",
				accessorFn: (r) => r.block || "—",
			},
			{
				id: "unitType",
				header: "Тип",
				accessorFn: (r) => UNIT_TYPE_LABELS[r.unitType] || r.unitType,
			},
			{
				id: "roomCount",
				header: "Комнат",
				accessorFn: (r) => r.roomCount ?? "—",
			},
			{
				id: "area",
				header: "Площадь",
				cell: ({ row }) => (
					<EditableAreaCell
						area={row.original.area}
						editable={!!canEditArea && !!onAreaSave}
						onSave={(val) => onAreaSave!(row.original, val)}
					/>
				),
			},
			{
				id: "pricePerSqm",
				header: "Цена/м²",
				meta: { align: "right" as const },
				cell: ({ row }) => (
					<span className="font-mono tabular-nums text-right block">
						{formatPriceSom(resolvedPricePerSqm(row.original))}
					</span>
				),
			},
			{
				id: "totalPrice",
				header: "Сумма",
				meta: { align: "right" as const },
				cell: ({ row }) => (
					<span className="font-mono tabular-nums text-right block text-emerald-700">
						{formatPriceSom(resolvedTotalPrice(row.original))}
					</span>
				),
			},
			{
				id: "status",
				header: "Статус",
				cell: ({ row }) => {
					const cfg = badgeCfgFor(statusBadgeMap, row.original.status);
					return (
						<Badge variant="outline" className={cfg.color}>
							{cfg.label}
						</Badge>
					);
				},
			},
			{
				id: "buyer",
				header: "Контрагент",
				accessorFn: (r) => r.contract?.buyerName || "—",
			},
			{
				id: "contract",
				header: "Договор",
				accessorFn: (r) => r.contract?.contractNumber || "—",
			},
		],
		[statusBadgeMap, onSelect, canEditArea, onAreaSave],
	);

	return (
		<Tablo
			tableId="sales-grid-list"
			title="Список квартир"
			meta={`${units.length} записей`}
			data={units}
			columns={columns}
			onRowClick={(row) => onSelect(row)}
		/>
	);
}
