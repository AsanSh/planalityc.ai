import { and, eq } from "drizzle-orm";
import { db, constructionUnitsTable } from "./db";

/** Тип здания проекта → тип юнита в шахматке. */
function unitTypeFromBuilding(buildingType?: string | null): string {
  return buildingType === "commercial" ? "commercial" : "apartment";
}

/**
 * Создаёт/досоздаёт юниты (construction_units) для шахматки по параметрам проекта.
 * Инкрементально: добавляет только НЕДОСТАЮЩИЕ номера, существующие юниты
 * (с ценами/статусами/покупателями) не трогает. Так правка проекта (рост этажей/
 * числа юнитов) дорастает шахматку без потери данных. Полное пересоздание — через
 * отдельный confirm-эндпоинт.
 * totalUnits — общее число юнитов; равномерно распределяется по этажам.
 */
export async function seedProjectUnits(
  companyId: number,
  projectId: number,
  totalFloors: number,
  totalUnits: number,
  currency = "KGS",
  buildingType?: string | null,
): Promise<number> {
  const floors = Math.max(1, Math.floor(totalFloors));
  const targetTotal = Math.max(1, Math.floor(totalUnits));
  const unitType = unitTypeFromBuilding(buildingType);

  const existingRows = await db
    .select({ unitNumber: constructionUnitsTable.unitNumber })
    .from(constructionUnitsTable)
    .where(
      and(
        eq(constructionUnitsTable.projectId, projectId),
        eq(constructionUnitsTable.companyId, companyId),
      ),
    );
  const existing = new Set(existingRows.map((r) => r.unitNumber));

  const basePerFloor = Math.floor(targetTotal / floors);
  const extraFloors = targetTotal % floors;

  const values: Array<typeof constructionUnitsTable.$inferInsert> = [];

  for (let f = 1; f <= floors; f++) {
    const unitsOnFloor = basePerFloor + (f <= extraFloors ? 1 : 0);
    for (let u = 1; u <= unitsOnFloor; u++) {
      const unitNum = `${f}${String(u).padStart(2, "0")}`;
      if (existing.has(unitNum)) continue; // не дублируем и не затираем существующие
      values.push({
        companyId,
        projectId,
        unitNumber: unitNum,
        floor: f,
        unitType,
        currency,
        status: "available",
      });
    }
  }

  if (values.length === 0) return 0;

  await db.insert(constructionUnitsTable).values(values);
  return values.length;
}
