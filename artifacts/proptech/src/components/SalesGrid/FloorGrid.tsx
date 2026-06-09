import { MatrixTableFrame } from "@/components/matrix-table-frame";
import type { StatusGridCfg } from "@/lib/unit-statuses";
import { useRef, useState } from "react";
import type { CellViewMode, SalesGridUnit } from "./types";
import { UnitCell } from "./UnitCell";

export function FloorGrid({
	units,
	statusGridMap,
	cellViewMode,
	isSalesOnly,
	panelUnitId,
	bulkSelectedIds,
	showBulkCheckbox,
	onOpenUnit,
	onBulkToggle,
	onBulkFloor,
	onMoveUnit,
}: {
	units: SalesGridUnit[];
	statusGridMap: Record<string, StatusGridCfg>;
	cellViewMode: CellViewMode;
	isSalesOnly: boolean;
	panelUnitId: number | null;
	bulkSelectedIds: Set<number>;
	showBulkCheckbox: boolean;
	onOpenUnit: (u: SalesGridUnit) => void;
	onBulkToggle: (id: number) => void;
	onBulkFloor: (floor: number, ids: number[]) => void;
	onMoveUnit?: (unitId: number, toFloor: number) => void;
}) {
	const floors = Array.from(new Set(units.map((u) => u.floor ?? 0))).sort((a, b) => b - a);
	const maxCols = Math.max(
		1,
		...floors.map((f) => units.filter((u) => (u.floor ?? 0) === f).length),
	);

	const [dragOverFloor, setDragOverFloor] = useState<number | null>(null);
	const dragUnitId = useRef<number | null>(null);

	return (
		<MatrixTableFrame className="overflow-x-auto">
			<table className="border-collapse">
				<tbody>
					{floors.map((floor, idx) => {
						const rowUnits = units
							.filter((u) => (u.floor ?? 0) === floor)
							.sort((a, b) =>
								a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
							);
						const floorIds = rowUnits.map((u) => u.id);
						const isDropTarget = dragOverFloor === floor;

						return (
							<tr
								key={floor}
								className={[
									idx !== 0 ? "border-t-2 border-slate-300" : "",
									isDropTarget ? "bg-blue-50/60" : "",
									"transition-colors duration-100",
								]
									.filter(Boolean)
									.join(" ")}
								onDragOver={(e) => {
									e.preventDefault();
									setDragOverFloor(floor);
								}}
								onDragLeave={() => setDragOverFloor(null)}
								onDrop={(e) => {
									e.preventDefault();
									setDragOverFloor(null);
									if (dragUnitId.current != null && onMoveUnit) {
										onMoveUnit(dragUnitId.current, floor);
									}
									dragUnitId.current = null;
								}}
							>
								<td className="sticky left-0 z-10 bg-white pr-2 align-middle">
									<button
										type="button"
										onClick={() => onBulkFloor(floor, floorIds)}
										className={[
											"flex h-20 w-12 flex-col items-center justify-center rounded-lg text-xs font-bold",
											isDropTarget
												? "bg-blue-200 text-blue-700"
												: "bg-slate-100 text-slate-600 hover:bg-slate-200",
										].join(" ")}
										title={showBulkCheckbox ? "Выбрать этаж (клик)" : undefined}
									>
										<span>{floor}</span>
										<span className="text-[9px] font-normal text-slate-400">эт</span>
									</button>
								</td>
								{Array.from({ length: maxCols }).map((_, col) => {
									const unit = rowUnits[col];
									if (!unit) {
										return <td key={col} className="p-1" />;
									}
									return (
										<td
											key={unit.id}
											className="p-1"
											draggable
											onDragStart={() => {
												dragUnitId.current = unit.id;
											}}
											onDragEnd={() => {
												dragUnitId.current = null;
												setDragOverFloor(null);
											}}
										>
											<UnitCell
												unit={unit}
												statusGridMap={statusGridMap}
												cellViewMode={cellViewMode}
												isSalesOnly={isSalesOnly}
												selected={panelUnitId === unit.id}
												bulkChecked={bulkSelectedIds.has(unit.id)}
												showBulkCheckbox={showBulkCheckbox}
												onBulkToggle={() => onBulkToggle(unit.id)}
												onOpen={() => onOpenUnit(unit)}
											/>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</MatrixTableFrame>
	);
}
