/**
 * Чистая логика приёмки на склад и списания (S6/S7). Без БД.
 * Приёмка обновляет остаток и средневзвешенную цену; списание считает сумму затрат.
 */

export interface ReceiptResult {
  quantity: number;
  avgPrice: number;
}

/**
 * Применить приёмку к позиции склада: новое количество и средневзвешенная цена.
 * Отрицательные значения трактуются как 0. Итоговое нулевое количество → цена 0.
 */
export function applyReceipt(
  currentQty: number,
  currentAvgPrice: number,
  receivedQty: number,
  receivedPrice: number,
): ReceiptResult {
  const curQ = Math.max(0, currentQty);
  const curP = Math.max(0, currentAvgPrice);
  const rcvQ = Math.max(0, receivedQty);
  const rcvP = Math.max(0, receivedPrice);
  const totalQty = curQ + rcvQ;
  if (totalQty <= 0) return { quantity: 0, avgPrice: 0 };
  const avgPrice = (curQ * curP + rcvQ * rcvP) / totalQty;
  return { quantity: totalQty, avgPrice };
}

/** Сумма списания материалов в затраты стройки = количество × средняя цена. */
export function computeWriteoffAmount(qty: number, avgPrice: number): number {
  return Math.max(0, qty) * Math.max(0, avgPrice);
}
