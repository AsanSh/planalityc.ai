import { downloadXlsx } from "./xlsx-lite";

/** Шаблон прайс-листа для импорта в platform-admin маркетплейс. */
export function downloadMarketplacePriceTemplate() {
	const rows = [
		["Наименование", "Цена", "Ед.", "Артикул", "Категория", "Описание"],
		["Цемент М500", 420, "меш", "CEM-500", "materials", ""],
		["Арматура 12мм", 95000, "т", "ARM-12", "materials", ""],
	];
	return downloadXlsx("шаблон_прайс_маркетплейс.xlsx", "Прайс", rows);
}
