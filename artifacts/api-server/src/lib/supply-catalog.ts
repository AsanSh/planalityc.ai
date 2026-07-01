/**
 * Чистая логика связки каталога со складом (фаза 3+).
 * Резолвит позицию заявки (ссылка на глобальный/поставщицкий товар)
 * в номенклатуру склада компании через global_product_id.
 */

export interface ReqItemRef {
  globalProductId: number | null;
  supplierProductId: number | null;
}

export interface SupplierProductRef {
  id: number;
  globalProductId: number | null;
}

export interface WarehouseItemRef {
  id: number;
  globalProductId: number | null;
}

/**
 * Определить id складской позиции для строки заявки.
 * Приоритет: прямой globalProductId → через supplierProduct.globalProductId.
 * Возвращает null, если сопоставить не удалось (кастомная позиция или нет связки на складе).
 */
export function resolveWarehouseItemId(
  ref: ReqItemRef,
  supplierProducts: SupplierProductRef[],
  warehouseItems: WarehouseItemRef[],
): number | null {
  let globalId: number | null = ref.globalProductId ?? null;
  if (globalId == null && ref.supplierProductId != null) {
    globalId = supplierProducts.find((s) => s.id === ref.supplierProductId)?.globalProductId ?? null;
  }
  if (globalId == null) return null;
  return warehouseItems.find((w) => w.globalProductId === globalId)?.id ?? null;
}
