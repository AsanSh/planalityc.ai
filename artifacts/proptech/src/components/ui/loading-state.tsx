import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingState({
	type = "spinner",
	rows = 3,
	className,
	size = "default",
}: {
	type?: "spinner" | "skeleton" | "pulse";
	rows?: number;
	className?: string;
	size?: "sm" | "default" | "lg";
}) {
	const spinnerSizes = {
		sm: "w-4 h-4",
		default: "w-8 h-8",
		lg: "w-12 h-12",
	};

	const skeletonHeights = {
		sm: "h-8",
		default: "h-12",
		lg: "h-16",
	};

	if (type === "skeleton") {
		return (
			<div className={cn("space-y-3", className)}>
				{Array.from({ length: rows }).map((_, i) => (
					<Skeleton
						key={i}
						className={cn(skeletonHeights[size], "w-full animate-pulse")}
					/>
				))}
			</div>
		);
	}

	if (type === "pulse") {
		return (
			<div className={cn("flex items-center justify-center py-12", className)}>
				<div
					className={cn(
						spinnerSizes[size],
						"rounded-full bg-cyan-500/20 animate-pulse",
					)}
				/>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center justify-center py-12", className)}>
			<Loader2
				className={cn(spinnerSizes[size], "text-cyan-600 animate-spin")}
			/>
		</div>
	);
}
