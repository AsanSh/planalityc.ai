import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
	buildStatusGridCfg,
	saleModeFor,
	type UnitStatusDto,
} from "@/lib/unit-statuses";

function fmtNum(v: string | number | null | undefined) {
	if (!v) return "—";
	return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(
		parseFloat(String(v)),
	);
}

const UNIT_TYPES = [
	{ value: "apartment", label: "Квартира" },
	{ value: "studio", label: "Студия" },
	{ value: "office", label: "Офис" },
	{ value: "commercial", label: "Коммерческое" },
	{ value: "parking", label: "Паркинг" },
	{ value: "storage", label: "Кладовая" },
];

export interface ChessDialogUnit {
	id: number;
	projectId: number;
	unitNumber: string;
	floor?: number;
	block?: string;
	unitType: string;
	roomCount?: number;
	area?: string;
	pricePerSqm?: string;
	totalPrice?: string;
	basePricePerSqm?: string;
	saleCoefficient?: string;
	priceCoefficient?: string;
	approvedSalePricePerSqm?: string;
	approvedTotalPrice?: string;
	listPrice?: string | null;
	isPublishedForSale?: boolean | null;
	priceApproved?: boolean;
	currency: string;
	status: string;
	notes?: string;
	// PTO area tracking
	areaModified?: boolean;
	originalArea?: string;
	areaDelta?: string;
	recalculationPrice?: string;
	supplementStatus?: string;
}
interface Project {
	id: number;
	name: string;
	totalFloors?: number;
	totalUnits?: number;
	baseSalePricePerSqm?: string | null;
	costPerSqm?: string | null;
	currency?: string;
}

function unitCoefficient(unit: Pick<ChessDialogUnit, "priceCoefficient" | "saleCoefficient">) {
	return unit.priceCoefficient || unit.saleCoefficient || "1";
}

function approvedPricePerSqm(unit: Pick<ChessDialogUnit, "approvedSalePricePerSqm" | "pricePerSqm">) {
	return unit.approvedSalePricePerSqm || unit.pricePerSqm || "";
}

type ApiError = Error & {
	status?: number;
	body?: {
		existingUnits?: number;
		error?: string;
		message?: string;
	};
};

export function UnitDialog({
	unit,
	projectId,
	onClose,
	onSaved,
	onRequestSale,
	statuses,
	statusGridMap,
	salesOnly,
}: {
	unit: ChessDialogUnit | null | "new";
	projectId: number;
	onClose: () => void;
	onSaved: () => void;
	onRequestSale?: (status: "reserved" | "sold", unit: ChessDialogUnit) => void;
	statuses: UnitStatusDto[];
	statusGridMap: ReturnType<typeof buildStatusGridCfg>;
	salesOnly?: boolean;
}) {
	const { toast } = useToast();
	const isEdit = !!unit && unit !== "new";
	const init = isEdit ? (unit as ChessDialogUnit) : null;
	const [form, setForm] = useState({
		unitNumber: init?.unitNumber || "",
		floor: String(init?.floor || ""),
		block: init?.block || "",
		unitType: init?.unitType || "apartment",
		roomCount: String(init?.roomCount || ""),
		area: init?.area || "",
		pricePerSqm: init?.pricePerSqm || "",
		currency: init?.currency || "KGS",
		status: init?.status || "available",
		notes: init?.notes || "",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const totalPrice =
		parseFloat(form.area || "0") * parseFloat(form.pricePerSqm || "0");

	const readOnly = salesOnly && isEdit;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (readOnly) return;
		if (!form.unitNumber) {
			toast({ title: "Укажите номер квартиры", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const body = { ...form, projectId };
			if (isEdit) {
				await api.patch(`/construction/units/${init?.id}`, body);
			} else {
				await api.post("/construction/units", body);
			}
			toast({ title: isEdit ? "Обновлено" : "Объект добавлен" });
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={!!unit} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? `Объект ${init?.unitNumber}` : "Добавить объект"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Номер *</Label>
							<Input
								className="mt-auto"
								value={form.unitNumber}
								onChange={(e) => set("unitNumber", e.target.value)}
								required
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Этаж</Label>
							<Input
								className="mt-auto"
								type="number"
								value={form.floor}
								onChange={(e) => set("floor", e.target.value)}
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Секция / блок</Label>
							<Input
								className="mt-auto"
								value={form.block}
								onChange={(e) => set("block", e.target.value)}
								placeholder="А"
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Тип</Label>
							<Select
								value={form.unitType}
								onValueChange={(v) => set("unitType", v)}
								disabled={readOnly}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{UNIT_TYPES.map((u) => (
										<SelectItem key={u.value} value={u.value}>
											{u.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Комнат</Label>
							<Input
								className="mt-auto"
								type="number"
								min="0"
								value={form.roomCount}
								onChange={(e) => set("roomCount", e.target.value)}
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Площадь (м²)</Label>
							<Input
								className="mt-auto"
								type="number"
								step="0.01"
								value={form.area}
								onChange={(e) => set("area", e.target.value)}
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Цена за м²</Label>
							<Input
								className="mt-auto"
								type="number"
								value={form.pricePerSqm}
								onChange={(e) => set("pricePerSqm", e.target.value)}
								readOnly={readOnly}
								disabled={readOnly}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Статус</Label>
							<Select
								value={form.status}
								onValueChange={(v) => {
									const sale = saleModeFor(statuses, v);
									if (isEdit && init && sale && onRequestSale) {
										onRequestSale(sale, init);
										return;
									}
									set("status", v);
								}}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{statuses.map((s) => (
										<SelectItem key={s.code} value={s.code}>
											{statusGridMap[s.code]?.label || s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{isEdit && statuses.some((s) => s.saleMode !== "none") && (
								<p className="text-xs text-muted-foreground mt-1">
									Статусы с бронью или продажей открывают оформление покупателя и
									графика платежей
								</p>
							)}
						</div>
					</div>
					{totalPrice > 0 && (
						<div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
							<p className="text-xs text-amber-600">Стоимость квартиры</p>
							<p className="text-lg font-bold text-amber-700">
								{fmtNum(totalPrice)} {form.currency}
							</p>
						</div>
					)}
					<div>
						<Label>Заметки</Label>
						<Input
							className="mt-1"
							value={form.notes}
							onChange={(e) => set("notes", e.target.value)}
							readOnly={readOnly}
							disabled={readOnly}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							{readOnly ? "Закрыть" : "Отмена"}
						</Button>
						{!readOnly && (
							<Button
								type="submit"
								className="bg-amber-500 hover:bg-orange-600"
								disabled={loading}
							>
								{loading ? "..." : "Сохранить"}
							</Button>
						)}
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function BulkGenerateDialog({
	projectId,
	onClose,
	onSaved,
}: {
	projectId: number;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [form, setForm] = useState({
		floors: "",
		unitsPerFloor: "",
		block: "",
		area: "",
		pricePerSqm: "",
		currency: "KGS",
	});
	const [loading, setLoading] = useState(false);
	const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

	const total =
		parseInt(form.floors || "0", 10) * parseInt(form.unitsPerFloor || "0", 10);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const floors = parseInt(form.floors || "0", 10);
		const unitsPerFloor = parseInt(form.unitsPerFloor || "0", 10);
		if (!Number.isFinite(floors) || floors <= 0 || !Number.isFinite(unitsPerFloor) || unitsPerFloor <= 0) {
			toast({ title: "Укажите этажи и квартиры", variant: "destructive" });
			return;
		}
		setLoading(true);
		try {
			const { data } = await api.post<ChessDialogUnit[]>("/construction/units/bulk", { ...form, projectId });
			toast({
				title: data.length > 0 ? `Сгенерировано ${data.length} квартир` : "Новых квартир не создано",
				description: data.length === 0 ? "Такие номера уже есть в шахматке" : undefined,
			});
			onSaved();
			onClose();
		} catch {
			toast({ title: "Ошибка", variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Быстрое заполнение шахматки</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Этажей *</Label>
							<Input
								className="mt-auto"
								type="number"
								min="1"
								value={form.floors}
								onChange={(e) => set("floors", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Квартир на этаже *</Label>
							<Input
								className="mt-auto"
								type="number"
								min="1"
								value={form.unitsPerFloor}
								onChange={(e) => set("unitsPerFloor", e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Секция</Label>
							<Input
								className="mt-auto"
								value={form.block}
								onChange={(e) => set("block", e.target.value)}
								placeholder="А"
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Площадь (м²)</Label>
							<Input
								className="mt-auto"
								type="number"
								value={form.area}
								onChange={(e) => set("area", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Цена за м²</Label>
							<Input
								className="mt-auto"
								type="number"
								value={form.pricePerSqm}
								onChange={(e) => set("pricePerSqm", e.target.value)}
							/>
						</div>
						<div className="flex flex-col">
							<Label className="leading-tight mb-1.5">Валюта</Label>
							<Select
								value={form.currency}
								onValueChange={(v) => set("currency", v)}
							>
								<SelectTrigger className="mt-auto">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["KGS", "USD", "EUR"].map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{total > 0 && (
						<p className="text-sm text-amber-600 font-medium text-center">
							Будет создано {total} квартир
						</p>
					)}
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-orange-600"
							disabled={loading}
						>
							{loading ? "Создание..." : "Сгенерировать"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function PtoEditAreaDialog({
	unit,
	open,
	hideFinancials,
	onClose,
	onSaved,
}: {
	unit: ChessDialogUnit | null;
	open: boolean;
	hideFinancials?: boolean;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { toast } = useToast();
	const [area, setArea] = useState("");
	const [reason, setReason] = useState("");
	const [doc, setDoc] = useState<{ fileName: string; mimeType: string; base64: string } | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (unit) {
			setArea(unit.area || "");
			setReason("");
			setDoc(null);
		}
	}, [unit?.id, open]);

	if (!unit) return null;

	const oldArea = parseFloat(unit.area || "0");
	const newArea = parseFloat(area || "0");
	const delta = newArea - oldArea;
	const pps = parseFloat(unit.pricePerSqm || "0");
	const newTotal = pps > 0 ? newArea * pps : 0;

	const handleFile = async (file: File) => {
		if (file.size > 8 * 1024 * 1024) {
			toast({ title: "Файл слишком большой (макс. 8 МБ)", variant: "destructive" });
			return;
		}
		const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
		if (!allowed.includes(file.type)) {
			toast({ title: "Только PDF или изображение", variant: "destructive" });
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			const base64 = result.split(",")[1] || "";
			setDoc({ fileName: file.name, mimeType: file.type, base64 });
		};
		reader.readAsDataURL(file);
	};

	const save = async () => {
		if (!area || newArea <= 0) {
			toast({ title: "Укажите корректную площадь", variant: "destructive" });
			return;
		}
		if (newArea === oldArea && !doc) {
			toast({ title: "Нет изменений для сохранения" });
			onClose();
			return;
		}
		setLoading(true);
		try {
			await api.patch(`/construction/units/${unit.id}/area`, {
				area,
				reason: reason.trim() || undefined,
				document: doc || undefined,
			});
			toast({
				title: "Площадь обновлена",
				description: `${oldArea} → ${newArea} м² (Δ${delta > 0 ? "+" : ""}${delta.toFixed(2)})`,
			});
			onSaved();
			onClose();
		} catch (e: any) {
			toast({
				title: "Ошибка обновления",
				description: e?.response?.data?.error || "—",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// Документ, который уже был загружен ранее (если есть)
	let existingDoc: { fileName?: string; mimeType?: string } | null = null;
	try {
		if ((unit as any).areaChangeDocumentMeta) {
			existingDoc = JSON.parse((unit as any).areaChangeDocumentMeta);
		}
	} catch {}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Изменение площади · кв. {unit.unitNumber}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{/* Базовая информация — без цены если ПТО */}
					<div className={`grid ${hideFinancials ? "grid-cols-3" : "grid-cols-2"} gap-3 text-sm bg-gray-50 rounded-lg p-3`}>
						<div>
							<p className="text-xs text-gray-500">Этаж</p>
							<p className="font-medium">{unit.floor || "—"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Блок</p>
							<p className="font-medium">{unit.block || "—"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Текущая площадь</p>
							<p className="font-bold text-base">{oldArea} м²</p>
						</div>
						{!hideFinancials && (
							<div>
								<p className="text-xs text-gray-500">Цена за м²</p>
								<p className="font-medium">
									{pps > 0 ? `${pps.toLocaleString("ru-KG")} ${unit.currency || "KGS"}` : "—"}
								</p>
							</div>
						)}
					</div>

					<div>
						<Label className="text-sm">Новая площадь (м²) *</Label>
						<Input
							className="mt-1 text-base h-11"
							type="number"
							step="0.01"
							value={area}
							onChange={(e) => setArea(e.target.value)}
							placeholder="например, 65.5"
							autoFocus
						/>
					</div>

					{/* Финансовая сводка скрыта для ПТО */}
					{!hideFinancials && delta !== 0 && newArea > 0 && (
						<div className={`rounded-lg p-3 text-sm ${delta > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
							<p className="flex justify-between">
								<span className="text-gray-600">Изменение:</span>
								<span className={`font-bold ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
									{delta > 0 ? "+" : ""}{delta.toFixed(2)} м²
								</span>
							</p>
							{pps > 0 && (
								<>
									<p className="flex justify-between mt-1">
										<span className="text-gray-600">Новая стоимость:</span>
										<span className="font-bold">
											{newTotal.toLocaleString("ru-KG")} {unit.currency || "KGS"}
										</span>
									</p>
									<p className="flex justify-between mt-1">
										<span className="text-gray-600">
											{delta > 0 ? "Клиент доплачивает:" : "Возврат клиенту:"}
										</span>
										<span className={`font-bold ${delta > 0 ? "text-amber-700" : "text-blue-700"}`}>
											{Math.abs(delta * pps).toLocaleString("ru-KG")} {unit.currency || "KGS"}
										</span>
									</p>
								</>
							)}
						</div>
					)}

					{/* Для ПТО — простое отображение дельты без сумм */}
					{hideFinancials && delta !== 0 && newArea > 0 && (
						<div className={`rounded-lg p-3 text-sm ${delta > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
							<p className="flex justify-between">
								<span className="text-gray-600">Изменение:</span>
								<span className={`font-bold ${delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>
									{delta > 0 ? "+" : ""}{delta.toFixed(2)} м²
								</span>
							</p>
						</div>
					)}

					<div>
						<Label className="text-sm">Причина изменения</Label>
						<textarea
							className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-20 resize-none"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Например: уточнение по обмерам БТИ, перепланировка..."
						/>
					</div>

					{/* Загрузка PDF/фото — обоснование (акт обмера, чертёж и т.д.) */}
					<div>
						<Label className="text-sm">Документ (PDF / фото)</Label>
						<div className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3">
							<input
								type="file"
								accept="application/pdf,image/*"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) handleFile(f);
								}}
								className="hidden"
								id="pto-doc-upload"
							/>
							<label
								htmlFor="pto-doc-upload"
								className="cursor-pointer flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-amber-600"
							>
								📎 {doc ? doc.fileName : existingDoc?.fileName ? `Заменить: ${existingDoc.fileName}` : "Прикрепить файл (акт обмера, чертёж)"}
							</label>
							{doc && (
								<button
									type="button"
									onClick={() => setDoc(null)}
									className="mt-1 text-[10px] text-rose-500 hover:underline w-full text-center"
								>
									✕ убрать
								</button>
							)}
						</div>
						<p className="text-[10px] text-gray-600 mt-1">PDF, JPG, PNG · до 8 МБ</p>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						<Button
							className="bg-amber-500 hover:bg-orange-600"
							onClick={save}
							disabled={loading || !area || (newArea === oldArea && !doc)}
						>
							{loading ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
