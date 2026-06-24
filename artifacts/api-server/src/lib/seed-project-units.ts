import { and, eq, inArray } from "drizzle-orm";
import { db, constructionUnitsTable } from "./db";

/** Тип здания проекта → тип юнита в шахматке. */
function unitTypeFromBuilding(buildingType?: string | null): string {
  return buildingType === "commercial" ? "commercial" : "apartment";
}

/** Желаемый набор юнитов по параметрам проекта (равномерно по этажам). */
function desiredUnits(totalFloors: number, totalUnits: number): Array<{ unitNumber: string; floor: number }> {
  const floors = Math.max(1, Math.floor(totalFloors));
  const target = Math.max(1, Math.floor(totalUnits));
  const basePerFloor = Math.floor(target / floors);
  const extraFloors = target % floors;
  const out: Array<{ unitNumber: string; floor: number }> = [];
  for (let f = 1; f <= floors; f++) {
    const unitsOnFloor = basePerFloor + (f <= extraFloors ? 1 : 0);
    for (let u = 1; u <= unitsOnFloor; u++) {
      out.push({ unitNumber: `${f}${String(u).padStart(2, "0")}`, floor: f });
    }
  }
  return out;
}

/**
 * Создаёт/досоздаёт юниты для шахматки. Инкрементально: добавляет только
 * НЕДОСТАЮЩИЕ номера, существующие не трогает. Используется при создании проекта.
 */
export async function seedProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
  currency = "KGS",
  buildingType?: string | null,
): Promise<number> {
  const unitType = unitTypeFromBuilding(buildingType);
  const existingRows = await db
    .select({ unitNumber: constructionUnitsTable.unitNumber })
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.projectId, projectId), eq(constructionUnitsTable.companyId, companyId)));
  const existing = new Set(existingRows.map((r) => r.unitNumber));

  const values = desiredUnits(totalFloors, totalUnits)
    .filter((d) => !existing.has(d.unitNumber))
    .map((d) => ({
      companyId,
      projectId,
      unitNumber: d.unitNumber,
      floor: d.floor,
      unitType,
      currency,
      status: "available" as const,
    }));

  if (values.length === 0) return 0;
  await db.insert(constructionUnitsTable).values(values);
  return values.length;
}

/**
 * Синхронизирует шахматку с параметрами проекта при ПРАВКЕ:
 *  - добавляет недостающие юниты,
 *  - удаляет ЛИШНИЕ (которых нет в новом наборе), но только свободные —
 *    проданные/забронированные/с покупателем или договором не трогает (skipped).
 * Возвращает {created, removed, skipped}.
 */
export async function syncProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
  currency = "KGS",
  buildingType?: string | null,
): Promise<{ created: number; removed: number; skipped: number }> {
  const unitType = unitTypeFromBuilding(buildingType);
  const desired = desiredUnits(totalFloors, totalUnits);
  const desiredSet = new Set(desired.map((d) => d.unitNumber));

  const existingRows = await db
    .select({
      id: constructionUnitsTable.id,
      unitNumber: constructionUnitsTable.unitNumber,
      status: constructionUnitsTable.status,
      buyerId: constructionUnitsTable.buyerId,
      salesContractId: constructionUnitsTable.salesContractId,
    })
    .from(constructionUnitsTable)
    .where(and(eq(constructionUnitsTable.projectId, projectId), eq(constructionUnitsTable.companyId, companyId)));
  const existingNumbers = new Set(existingRows.map((r) => r.unitNumber));

  // ADD missing
  const toAdd = desired
    .filter((d) => !existingNumbers.has(d.unitNumber))
    .map((d) => ({
      companyId,
      projectId,
      unitNumber: d.unitNumber,
      floor: d.floor,
      unitType,
      currency,
      status: "available" as const,
    }));

  // TRIM excess (not in desired) — only free units; keep sold/reserved/linked.
  const lockedStatuses = new Set(["sold", "reserved", "registered", "occupied"]);
  const toRemoveIds: number[] = [];
  let skipped = 0;
  for (const r of existingRows) {
    if (desiredSet.has(r.unitNumber)) continue;
    const free = !lockedStatuses.has(r.status) && !r.buyerId && !r.salesContractId;
    if (free) toRemoveIds.push(r.id);
    else skipped++;
  }

  if (toAdd.length) await db.insert(constructionUnitsTable).values(toAdd);
  if (toRemoveIds.length) {
    await db
      .delete(constructionUnitsTable)
      .where(
        and(
          eq(constructionUnitsTable.projectId, projectId),
          eq(constructionUnitsTable.companyId, companyId),
          inArray(constructionUnitsTable.id, toRemoveIds),
        ),
      );
  }

  return { created: toAdd.length, removed: toRemoveIds.length, skipped };
}
