/**
 * Чистая логика сбора заказа снабжения (S3): мультиобъектный сорсинг и цены.
 * Без БД.
 */

export interface OtherObjectStock {
  warehouseId: number;
  available: number;
}

export interface SourcingResult {
  fromOwn: number;
  fromOthers: Array<{ warehouseId: number; qty: number }>;
  toPurchase: number;
}

/**
 * Разложить потребность: сначала свой объект, затем другие объекты в переданном
 * порядке, остаток — к покупке. Отрицательные остатки трактуются как 0.
 */
export function planMultiObjectSourcing(
  needed: number,
  ownAvailable: number,
  others: OtherObjectStock[],
): SourcingResult {
  let remaining = Math.max(0, needed);
  const fromOwn = Math.min(Math.max(0, ownAvailable), remaining);
  remaining -= fromOwn;
  const fromOthers: Array<{ warehouseId: number; qty: number }> = [];
  for (const o of others) {
    if (remaining <= 0) break;
    const take = Math.min(Math.max(0, o.available), remaining);
    if (take > 0) {
      fromOthers.push({ warehouseId: o.warehouseId, qty: take });
      remaining -= take;
    }
  }
  return { fromOwn, fromOthers, toPurchase: remaining };
}
