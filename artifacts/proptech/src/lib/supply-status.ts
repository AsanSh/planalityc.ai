/**
 * Единый словарь статусов заявки снабжения (совпадает с машиной статусов
 * бэкенда lib/supply-workflow.ts: draft → pending_approval → approved →
 * planned → ordered → closed, а также rejected / cancelled).
 */

export const REQUEST_STATUS_LABEL: Record<string, string> = {
	draft: "Черновик",
	pending_approval: "На согласовании ПТО",
	approved: "Одобрена",
	planned: "Распланирована",
	ordered: "Заказана",
	closed: "Закрыта",
	rejected: "Отклонена",
	cancelled: "Отменена",
};

export const REQUEST_STATUS_BADGE: Record<string, string> = {
	draft: "bg-gray-100 text-gray-700 border-gray-200",
	pending_approval: "bg-amber-100 text-amber-700 border-amber-200",
	approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
	planned: "bg-sky-100 text-sky-700 border-sky-200",
	ordered: "bg-indigo-100 text-indigo-700 border-indigo-200",
	closed: "bg-gray-100 text-gray-600 border-gray-200",
	rejected: "bg-rose-100 text-rose-700 border-rose-200",
	cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export function requestStatusLabel(status: string): string {
	return REQUEST_STATUS_LABEL[status] ?? status;
}

export function requestStatusBadge(status: string): string {
	return REQUEST_STATUS_BADGE[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

/** Фильтры для очереди согласования ПТО. */
export const REQUEST_STATUS_FILTERS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: "pending_approval", label: "На согласовании" },
	{ value: "approved", label: "Одобренные" },
	{ value: "rejected", label: "Отклонённые" },
	{ value: "ordered", label: "Заказанные" },
	{ value: "all", label: "Все" },
];
