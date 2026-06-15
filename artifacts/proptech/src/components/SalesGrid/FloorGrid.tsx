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
		<MatrixTableFrame className="overflow-x-auto bg-[linear-gradient(180deg,#f8fbfc_0%,#f1f7f8_100%)] p-3">
			<table className="border-separate border-spacing-[4px]">
				<tbody>
					{floors.map((floor, idx) => {
						const rowUnits = units
							.filter((u) => (u.floor ?? 0) === floor)
							.sort((a, b) =>
								a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
							);
						const floorIds = rowUnits.map((u) => u.id);
						const isDropTarget = dragOverFloor === floor;

						const tdBase = [
							isDropTarget ? "bg-cyan-50/80" : "",
							"rounded-[18px] transition-colors duration-150",
						]
							.filter(Boolean)
							.join(" ");

						return (
							<>
								{idx > 0 && (
									<tr key={`sep-${floor}`} aria-hidden>
										<td
											colSpan={maxCols + 1}
											className="py-0"
										>
											<div className="mx-1 border-t border-dashed border-slate-200" />
										</td>
									</tr>
								)}
							<tr
								key={floor}
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
								<td className={`sticky left-0 z-10 pr-2 align-middle ${tdBase}`}>
									<button
										type="button"
										onClick={() => onBulkFloor(floor, floorIds)}
										className={[
											"flex h-20 w-12 flex-col items-center justify-center rounded-[16px] border text-xs font-bold shadow-[0_10px_24px_-22px_rgba(15,23,42,0.65)] transition-all duration-200",
											isDropTarget
												? "border-cyan-300 bg-cyan-100 text-cyan-800"
												: "border-slate-200 bg-white/90 text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50",
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
										return <td key={col} className={`p-1 ${tdBase}`} />;
									}
									return (
										<td
											key={unit.id}
											className={`p-1 ${tdBase}`}
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
						</>
						);
					})}
				</tbody>
			</table>
		</MatrixTableFrame>
	);
}
