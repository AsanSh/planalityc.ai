import { RotateCcw } from "lucide-react";
import { CurrencyToggle } from "@/components/currency-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useProjectDisplayCurrency } from "@/hooks/use-project-display-currency";

type DisplayCurrencyState = ReturnType<typeof useProjectDisplayCurrency>;

export function ProjectDisplayCurrencyControls({
	displayCurrency,
	setDisplayCurrency,
	displayUsdRate,
	manualUsdRate,
	setManualRateFromInput,
	resetManualRate,
	isManualRate,
	rateLabel,
	nbkrRateLabel,
	nbkrDate,
	compact = false,
}: DisplayCurrencyState & { compact?: boolean }) {
	return (
		<div
			className={
				compact
					? "flex flex-wrap items-center gap-2"
					: "flex flex-col items-end gap-1.5"
			}
		>
			<CurrencyToggle
				value={displayCurrency}
				onChange={setDisplayCurrency}
				rateLabel={displayCurrency === "USD" ? rateLabel : nbkrRateLabel}
				nbkrDate={nbkrDate}
				compact={compact}
				showRate={!compact}
			/>
			<div className="flex items-center gap-1.5">
				<label className="sr-only" htmlFor="project-usd-rate">
					Курс USD к сому
				</label>
				<span className="whitespace-nowrap text-[11px] text-slate-500">1 USD =</span>
				<Input
					id="project-usd-rate"
					type="text"
					inputMode="decimal"
					className="h-8 w-[88px] px-2 text-xs tabular-nums"
					value={
						manualUsdRate != null
							? String(manualUsdRate)
							: displayUsdRate > 0
								? String(displayUsdRate)
								: ""
					}
					onChange={(e) => setManualRateFromInput(e.target.value)}
					title="Курс для просмотра; при обновлении страницы — курс НБКР"
				/>
				<span className="whitespace-nowrap text-[11px] text-slate-500">сом</span>
				{isManualRate ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0"
						onClick={resetManualRate}
						title="Вернуть курс НБКР"
					>
						<RotateCcw className="h-3.5 w-3.5" />
					</Button>
				) : null}
			</div>
		</div>
	);
}
