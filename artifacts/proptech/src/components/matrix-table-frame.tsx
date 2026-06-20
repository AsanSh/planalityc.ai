import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Единый стиль шапки (как DataTable). */
export const MATRIX_TH =
	"px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/78 whitespace-nowrap bg-slate-950 border-b border-slate-800";

export const MATRIX_TH_STICKY_LEFT = cn(
	MATRIX_TH,
	"sticky left-0 z-30 bg-slate-950 backdrop-blur-sm",
);

export const MATRIX_TH_RIGHT = cn(MATRIX_TH, "text-right");

export const MATRIX_TH_CENTER = cn(MATRIX_TH, "text-center");

type MatrixTableFrameProps = {
	title?: string;
	toolbar?: ReactNode;
	onExportCsv?: () => void;
	maxHeight?: string;
	children: ReactNode;
	className?: string;
};

/** Оболочка для широких матриц (план-факт, прогноз, шахматка-сетка) — тулбар + скролл. */
export function MatrixTableFrame({
	title,
	toolbar,
	onExportCsv,
	maxHeight,
	children,
	className,
}: MatrixTableFrameProps) {
	return (
		<div className="am-table-wrap rounded-[18px] overflow-hidden">
			{(title || toolbar || onExportCsv) && (
				<div className="px-4 py-2.5 border-b border-am-border/80 flex items-center justify-between gap-2 flex-wrap bg-white/82">
					{title ? (
						<h3 className="text-sm font-semibold text-am-text-strong">{title}</h3>
					) : (
						<span />
					)}
					<div className="flex items-center gap-2 flex-wrap ml-auto">
						{toolbar}
						{onExportCsv && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs gap-1.5"
								onClick={onExportCsv}
							>
								<Download className="w-3.5 h-3.5" />
								CSV
							</Button>
						)}
					</div>
				</div>
			)}
			<div
				className={cn("overflow-auto", className)}
				style={maxHeight ? { maxHeight } : undefined}
			>
				{children}
			</div>
		</div>
	);
}
