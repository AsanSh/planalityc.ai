/**
 * Чистая логика партионного учёта и разбиения заявки (фаза 3).
 * Без БД — арифметика по партиям и распределению «со склада / докупить».
 */

export interface Batch {
  id: number;
  quantity: string; // остаток партии
  unitPrice: string; // цена поступления партии
  receivedAt: string; // для FIFO-порядка (ISO-строка)
}

export interface SplitResult {
  fromStock: number;
  toPurchase: number;
}

/**
 * Разбить потребность на «выдать со склада» и «докупить».
 * Отрицательный доступный остаток трактуется как 0.
 */
export function splitRequestItem(available: number, needed: number): SplitResult {
  const avail = Math.max(0, available);
  const fromStock = Math.min(avail, needed);
  return { fromStock, toPurchase: needed - fromStock };
}

/** Средневзвешенная цена по остаткам партий. Пусто/ноль количества → 0. */
export function weightedAvgPrice(batches: Batch[]): number {
  let qty = 0;
  let value = 0;
  for (const b of batches) {
    const q = Number(b.quantity);
    qty += q;
    value += q * Number(b.unitPrice);
  }
  return qty > 0 ? value / qty : 0;
}

export interface ConsumeResult {
  consumed: Array<{ batchId: number; quantity: number; unitPrice: number }>;
  cost: number;
  shortfall: number; // сколько не хватило партий
}

/**
 * Списать количество по FIFO (партии сортируются по дате поступления).
 * Возвращает список списаний, стоимость и недостачу партий (если есть).
 */
export function consumeBatchesFIFO(batches: Batch[], quantity: number): ConsumeResult {
  const ordered = [...batches].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const consumed: ConsumeResult["consumed"] = [];
  let remaining = quantity;
  let cost = 0;
  for (const b of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(Number(b.quantity), remaining);
    if (take <= 0) continue;
    const price = Number(b.unitPrice);
    consumed.push({ batchId: b.id, quantity: take, unitPrice: price });
    cost += take * price;
    remaining -= take;
  }
  return { consumed, cost, shortfall: Math.max(0, remaining) };
}
