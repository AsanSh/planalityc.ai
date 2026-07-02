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

export interface OrderLineInput {
  productId: number;
  quantity: number;
}

export interface PricedLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Проставить цены позициям заказа по прайсу (productId → цена). Нет цены → 0.
 * Возвращает позиции с суммами и общий итог.
 */
export function priceOrderLines(
  lines: OrderLineInput[],
  priceByProductId: Record<number, number>,
): { lines: PricedLine[]; total: number } {
  const priced: PricedLine[] = lines.map((l) => {
    const unitPrice = priceByProductId[l.productId] ?? 0;
    return { productId: l.productId, quantity: l.quantity, unitPrice, lineTotal: unitPrice * l.quantity };
  });
  const total = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  return { lines: priced, total };
}
