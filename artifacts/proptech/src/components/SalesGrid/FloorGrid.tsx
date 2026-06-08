import { MatrixTableFrame } from "@/components/matrix-table-frame";
import type { StatusGridCfg } from "@/lib/unit-statuses";
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
}) {
	const floors = Array.from(new Set(units.map((u) => u.floor ?? 0))).sort((a, b) => b - a);
	const maxCols = Math.max(
		1,
		...floors.map((f) => units.filter((u) => (u.floor ?? 0) === f).length),
	);

	return (
		<MatrixTableFrame className="overflow-x-auto">
			<table className="border-collapse">
				<tbody>
					{floors.map((floor) => {
						const rowUnits = units
							.filter((u) => (u.floor ?? 0) === floor)
							.sort((a, b) =>
								a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
							);
						const floorIds = rowUnits.map((u) => u.id);
						return (
							<tr key={floor}>
								<td className="sticky left-0 z-10 bg-white pr-2 align-middle">
									<button
										type="button"
										onClick={() => onBulkFloor(floor, floorIds)}
										className="flex h-20 w-12 flex-col items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
										title={showBulkCheckbox ? "Выбрать этаж" : undefined}
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
										<td key={unit.id} className="p-1">
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
