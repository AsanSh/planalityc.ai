/**
 * Чистая логика складского учёта для модуля снабжения.
 * Без обращений к БД — только арифметика и правила переходов,
 * чтобы покрывать юнит-тестами (tsx --test) без Postgres.
 */

export type WarehouseType = "central" | "project" | "foreman" | "transit";

export interface WarehouseRef {
  id: number;
  type: WarehouseType;
}

export interface TransferLine {
  itemId: number;
  quantitySent: string;
  quantityReceived?: string | null;
}

export interface Discrepancy {
  itemId: number;
  sent: number;
  received: number;
  delta: number;
}

export interface ReceiptResult {
  status: "received" | "received_with_discrepancy";
  discrepancies: Discrepancy[];
}

/** Можно ли перемещать между складами (сейчас — любой в любой, кроме самого в себя). */
export function isTransferAllowed(from: WarehouseRef, to: WarehouseRef): boolean {
  return from.id !== to.id;
}

/** Сколько на складе доступно к резерву/выдаче: остаток минус уже зарезервированное, не ниже нуля. */
export function availableToReserve(quantity: string, reserved: string): number {
  return Math.max(0, Number(quantity) - Number(reserved));
}

/**
 * Рассчитать результат приёмки перемещения.
 * Пустое quantityReceived означает «получено полностью» (= quantitySent).
 */
export function computeTransferReceipt(lines: TransferLine[]): ReceiptResult {
  const discrepancies: Discrepancy[] = [];
  for (const l of lines) {
    const sent = Number(l.quantitySent);
    const received = Number(l.quantityReceived ?? l.quantitySent);
    if (received !== sent) {
      discrepancies.push({ itemId: l.itemId, sent, received, delta: received - sent });
    }
  }
  return {
    status: discrepancies.length ? "received_with_discrepancy" : "received",
    discrepancies,
  };
}
