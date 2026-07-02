/**
 * Чистая логика финсогласования и оплаты заказа снабжения.
 * Без БД — машина статусов оплаты и разрешение согласующего по лимитам.
 */

export type PaymentStatus =
  | "none"
  | "pending_finance"
  | "approved_by_finance"
  | "sent_to_payment"
  | "paid_partially"
  | "paid"
  | "payment_rejected";

export type PaymentEvent =
  | { type: "submit" }
  | { type: "approve" }
  | { type: "reject" }
  | { type: "send" }
  | { type: "pay"; paidAmount: number; totalAmount: number };

/**
 * Переход машины статусов оплаты. Бросает при недопустимом переходе.
 */
export function nextPaymentStatus(current: PaymentStatus, event: PaymentEvent): PaymentStatus {
  switch (event.type) {
    case "submit":
      if (current === "none" || current === "payment_rejected") return "pending_finance";
      break;
    case "approve":
      if (current === "pending_finance") return "approved_by_finance";
      break;
    case "reject":
      if (current === "pending_finance" || current === "approved_by_finance") return "payment_rejected";
      break;
    case "send":
      if (current === "approved_by_finance") return "sent_to_payment";
      break;
    case "pay":
      if (current === "sent_to_payment" || current === "paid_partially") {
        return event.paidAmount >= event.totalAmount ? "paid" : "paid_partially";
      }
      break;
  }
  throw new Error(`Недопустимый переход оплаты: ${current} + ${event.type}`);
}

export interface ApprovalLimit {
  role: string;
  maxAmount: string; // numeric как строка
}

/**
 * Определить требуемого согласующего по сумме: минимальный уровень,
 * чей лимит покрывает сумму; если сумма выше всех — высший уровень.
 * Без лимитов — null (согласование не требуется/не настроено).
 */
export function resolveRequiredApprover(amount: string, limits: ApprovalLimit[]): string | null {
  if (limits.length === 0) return null;
  const sorted = [...limits].sort((a, b) => Number(a.maxAmount) - Number(b.maxAmount));
  const amt = Number(amount);
  const covering = sorted.find((l) => amt <= Number(l.maxAmount));
  return covering ? covering.role : sorted[sorted.length - 1].role;
}

/**
 * Может ли согласующий с ролью approverRole утвердить заявку на сумму amount
 * по матрице лимитов. Полномочия = maxAmount роли: старше тот, у кого лимит больше.
 * Пустая матрица — ограничение не применяется (true).
 */
export function canApproveAmount(
  approverRole: string,
  amount: string,
  limits: ApprovalLimit[],
): boolean {
  if (limits.length === 0) return true;
  const approverLimit = limits.find((l) => l.role === approverRole);
  if (!approverLimit) return false;
  const requiredRole = resolveRequiredApprover(amount, limits);
  if (requiredRole == null) return true;
  const requiredLimit = limits.find((l) => l.role === requiredRole);
  if (!requiredLimit) return false;
  return Number(approverLimit.maxAmount) >= Number(requiredLimit.maxAmount);
}
