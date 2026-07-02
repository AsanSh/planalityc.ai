/**
 * Чистая агрегация остатков по объекту строительства (S1).
 * Объект = проект; его остаток складывается из складов типа project|foreman
 * с тем же projectId. Central/transit в объектный остаток не входят.
 */

export type WarehouseType = "central" | "project" | "foreman" | "transit";

export interface WarehouseRow {
  id: number;
  type: WarehouseType;
  projectId: number | null;
}

export interface StockRow {
  warehouseId: number;
  itemId: number;
  quantity: string;
  reservedQuantity: string;
}

export interface ObjectStockLine {
  itemId: number;
  quantity: number;
  reserved: number;
  available: number;
}

/** Суммарные остатки товаров на объекте (проекте), отсортированные по itemId. */
export function aggregateObjectStock(
  projectId: number,
  warehouses: WarehouseRow[],
  stock: StockRow[],
): ObjectStockLine[] {
  const objectWarehouseIds = new Set(
    warehouses
      .filter(
        (w) => (w.type === "project" || w.type === "foreman") && w.projectId === projectId,
      )
      .map((w) => w.id),
  );
  const byItem = new Map<number, ObjectStockLine>();
  for (const s of stock) {
    if (!objectWarehouseIds.has(s.warehouseId)) continue;
    const line =
      byItem.get(s.itemId) ?? { itemId: s.itemId, quantity: 0, reserved: 0, available: 0 };
    line.quantity += Number(s.quantity);
    line.reserved += Number(s.reservedQuantity);
    line.available = Math.max(0, line.quantity - line.reserved);
    byItem.set(s.itemId, line);
  }
  return [...byItem.values()].sort((a, b) => a.itemId - b.itemId);
}
