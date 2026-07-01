/**
 * Лёгкая обёртка над exceljs для чтения/записи .xlsx в браузере.
 * Заменяет библиотеку `xlsx` (SheetJS), у которой есть незакрытые уязвимости
 * (Prototype Pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9).
 * exceljs подгружается динамически, чтобы не попадать в основной бандл.
 */

async function getExcelJS() {
	const mod = await import("exceljs");
	return (mod as { default?: typeof import("exceljs") }).default ?? mod;
}

/** Приводит значение ячейки exceljs к примитиву (строка/число/Date). */
function plainCellValue(v: unknown): unknown {
	if (v == null) return "";
	if (v instanceof Date) return v;
	if (typeof v === "object") {
		const o = v as Record<string, unknown>;
		if ("result" in o) return plainCellValue(o.result ?? "");
		if ("richText" in o)
			return (o.richText as { text: string }[]).map((t) => t.text).join("");
		if ("text" in o) return o.text;
		if ("hyperlink" in o) return o.hyperlink;
		if ("error" in o) return "";
	}
	return v;
}

/**
 * Читает первый лист файла как массив строк-массивов
 * (аналог sheet_to_json c header:1, defval:"").
 * Ячейки с датами приходят как Date, а не как serial-число.
 */
export async function readSheetRows(file: File | Blob): Promise<unknown[][]> {
	const ExcelJS = await getExcelJS();
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(await file.arrayBuffer());
	const ws = wb.worksheets[0];
	if (!ws) return [];
	const rows: unknown[][] = [];
	ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
		const values: unknown[] = [];
		row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			values[colNumber - 1] = plainCellValue(cell.value);
		});
		rows[rowNumber - 1] = values;
	});
	for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
	return rows;
}

/**
 * Читает первый лист как массив объектов: первая строка — заголовки,
 * пустые ячейки — "" (аналог sheet_to_json с defval:""). Пустые строки пропускаются.
 */
export async function readSheetObjects(
	file: File | Blob,
): Promise<Record<string, unknown>[]> {
	const rows = await readSheetRows(file);
	if (rows.length === 0) return [];
	const headers = rows[0].map((h, i) => String(h ?? "").trim() || `__EMPTY_${i}`);
	const out: Record<string, unknown>[] = [];
	for (let i = 1; i < rows.length; i++) {
		const r = rows[i];
		if (r.every((c) => c == null || c === "")) continue;
		const obj: Record<string, unknown> = {};
		headers.forEach((h, j) => {
			obj[h] = r[j] ?? "";
		});
		out.push(obj);
	}
	return out;
}

export interface XlsxSheet {
	name: string;
	rows: unknown[][];
	colWidths?: number[];
}

/** Формирует многолистовой .xlsx и скачивает его в браузере. */
export async function downloadXlsxMulti(
	filename: string,
	sheets: XlsxSheet[],
): Promise<void> {
	const ExcelJS = await getExcelJS();
	const wb = new ExcelJS.Workbook();
	for (const sheet of sheets) {
		const ws = wb.addWorksheet(sheet.name);
		ws.addRows(sheet.rows);
		sheet.colWidths?.forEach((w, i) => {
			ws.getColumn(i + 1).width = w;
		});
	}
	const buf = await wb.xlsx.writeBuffer();
	const blob = new Blob([buf], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Формирует однолистовой .xlsx из массива строк-массивов и скачивает его. */
export function downloadXlsx(
	filename: string,
	sheetName: string,
	rows: unknown[][],
	opts?: { colWidths?: number[] },
): Promise<void> {
	return downloadXlsxMulti(filename, [
		{ name: sheetName, rows, colWidths: opts?.colWidths },
	]);
}
