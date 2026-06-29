import { Building2, Download, Grid3X3, Landmark, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalesGridView } from "./types";

const VIEWS: { id: SalesGridView; label: string; icon: typeof Grid3X3 }[] = [
	{ id: "grid", label: "Шахматка", icon: Grid3X3 },
	{ id: "financial", label: "Финслой", icon: Landmark },
	{ id: "list", label: "Список", icon: Building2 },
	{ id: "agents", label: "Контрагенты", icon: Users },
];

export function ViewSwitcher({
	view,
	onChange,
	onExportCsv,
	onExportExcel,
	onImport,
	isMobile,
	gridOnly,
}: {
	view: SalesGridView;
	onChange: (v: SalesGridView) => void;
	onExportCsv?: () => void;
	onExportExcel?: () => void;
	onImport?: () => void;
	isMobile?: boolean;
	gridOnly?: boolean;
}) {
	// ПТО/стройка: только «Шахматка» (площади), без финслоя/списка/контрагентов
	const views = gridOnly ? VIEWS.filter((v) => v.id === "grid") : VIEWS;
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex flex-wrap gap-1.5">
				{views.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type="button"
						disabled={isMobile && (id === "grid" || id === "financial")}
						onClick={() => onChange(id)}
						className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
							view === id
								? "bg-slate-950 text-white"
								: "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
						}`}
					>
						<Icon className="h-3.5 w-3.5" />
						{label}
					</button>
				))}
			</div>
			<div className="flex gap-1.5">
				{onExportCsv && (
					<Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExportCsv}>
						<Download className="h-3.5 w-3.5" />
						CSV
					</Button>
				)}
				{onExportExcel && (
					<Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExportExcel}>
						<Download className="h-3.5 w-3.5" />
						Excel
					</Button>
				)}
				{onImport && (
					<Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onImport}>
						<Upload className="h-3.5 w-3.5" />
						Импорт
					</Button>
				)}
			</div>
		</div>
	);
}
