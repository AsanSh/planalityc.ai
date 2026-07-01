import { downloadXlsx, readSheetObjects } from "./xlsx-lite";

export const UNIT_TEMPLATE_HEADERS = [
	"Номер",
	"Этаж",
	"Секция",
	"Тип",
	"Комнат",
	"Площадь м²",
	"Цена за м²",
	"Валюта",
	"Статус",
	"Заметки",
] as const;

const STATUS_RU: Record<string, string> = {
	available: "Свободна",
	reserved: "Забронирована",
	sold: "Продана",
	occupied: "Заселена",
	construction: "Строится",
};

const TYPE_RU: Record<string, string> = {
	apartment: "Квартира",
	studio: "Студия",
	office: "Офис",
	commercial: "Коммерческое",
	parking: "Паркинг",
	storage: "Кладовая",
};

export type UnitImportRow = Record<string, unknown>;

export function downloadUnitsTemplate(projectName?: string) {
	const example = [
		["101", 1, "А", "Квартира", 2, 65.5, 120000, "KGS", "Свободна", ""],
		["102", 1, "А", "Квартира", 3, 78, 120000, "KGS", "Свободна", ""],
	];
	const name = projectName
		? `шаблон_квартир_${projectName.replace(/\s+/g, "_")}.xlsx`
		: "шаблон_квартир_шахматка.xlsx";
	return downloadXlsx(name, "Квартиры", [[...UNIT_TEMPLATE_HEADERS], ...example]);
}

export async function parseUnitsFile(file: File): Promise<UnitImportRow[]> {
	const rows = await readSheetObjects(file);
	return rows.filter((r) => String(r["Номер"] ?? r.unitNumber ?? "").trim());
}

export type UnitExportRow = {
	unitNumber: string;
	floor?: number | null;
	block?: string | null;
	unitType: string;
	roomCount?: number | null;
	area?: string | null;
	pricePerSqm?: string | null;
	totalPrice?: string | null;
	currency: string;
	status: string;
	notes?: string | null;
	buyerName?: string | null;
	contractTotal?: string | null;
	paidAmount?: string | null;
	remainingAmount?: string | null;
};

export function exportUnitsToExcel(
	units: UnitExportRow[],
	projectName: string,
) {
	const header = [
		"Номер",
		"Этаж",
		"Секция",
		"Тип",
		"Комнат",
		"Площадь м²",
		"Цена за м²",
		"Стоимость",
		"Валюта",
		"Статус",
		"Покупатель",
		"Сумма договора",
		"Оплачено",
		"Остаток",
		"Заметки",
	];
	const rows = units.map((u) => [
		u.unitNumber,
		u.floor ?? "",
		u.block ?? "",
		TYPE_RU[u.unitType] || u.unitType,
		u.roomCount ?? "",
		u.area ?? "",
		u.pricePerSqm ?? "",
		u.totalPrice ?? "",
		u.currency,
		STATUS_RU[u.status] || u.status,
		u.buyerName ?? "",
		u.contractTotal ?? "",
		u.paidAmount ?? "",
		u.remainingAmount ?? "",
		u.notes ?? "",
	]);
	const safeName = projectName.replace(/[^\wЀ-ӿ-]+/g, "_").replace(/_+/g, "_");
	const fname = `kvartiry-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
	return downloadXlsx(fname, "Квартиры", [header, ...rows]);
}
