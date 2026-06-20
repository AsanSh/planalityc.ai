import { cn } from "@/lib/utils";

type ConstructionLoaderProps = {
	label?: string;
	className?: string;
	size?: "sm" | "default" | "lg";
	showLabel?: boolean;
};

const sizeClass = {
	sm: "w-16",
	default: "w-24",
	lg: "w-36",
};

export function ConstructionLoader({
	label = "Загрузка...",
	className,
	size = "default",
	showLabel = true,
}: ConstructionLoaderProps) {
	return (
		<div
			role="status"
			aria-label={label}
			className={cn(
				"inline-flex items-center gap-3 rounded-[18px] border border-am-border/90 bg-white/86 px-4 py-3 text-am-text shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md",
				className,
			)}
		>
			<img
				src="/construction-crane-loader.svg"
				alt=""
				aria-hidden="true"
				className={cn("block h-auto shrink-0", sizeClass[size])}
			/>
			{showLabel && (
				<span className="whitespace-nowrap text-sm font-medium text-am-text-muted">
					{label}
				</span>
			)}
		</div>
	);
}
