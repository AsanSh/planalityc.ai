/**
 * Чистая машина статусов ЗАЯВКИ снабжения (S2) — единственный источник правды
 * по переходам заявки. Без БД. Машина статусов ОПЛАТЫ — в supply-payments.ts.
 */

export type RequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "planned"
  | "ordered"
  | "closed"
  | "rejected"
  | "cancelled";

export type RequestEvent =
  | { type: "submit" }
  | { type: "approve" }
  | { type: "reject" }
  | { type: "plan" }
  | { type: "order" }
  | { type: "close" }
  | { type: "cancel" };

const CANCELLABLE: RequestStatus[] = ["draft", "pending_approval", "approved", "planned"];

/** Переход машины статусов заявки. Бросает при недопустимом переходе. */
export function nextRequestStatus(current: RequestStatus, event: RequestEvent): RequestStatus {
  switch (event.type) {
    case "submit":
      if (current === "draft") return "pending_approval";
      break;
    case "approve":
      if (current === "pending_approval") return "approved";
      break;
    case "reject":
      if (current === "pending_approval") return "rejected";
      break;
    case "plan":
      if (current === "approved") return "planned";
      break;
    case "order":
      if (current === "planned") return "ordered";
      break;
    case "close":
      if (current === "ordered") return "closed";
      break;
    case "cancel":
      if (CANCELLABLE.includes(current)) return "cancelled";
      break;
  }
  throw new Error(`Недопустимый переход заявки: ${current} + ${event.type}`);
}
