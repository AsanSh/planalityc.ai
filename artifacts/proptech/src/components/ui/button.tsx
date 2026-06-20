import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"am-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "am-btn-primary hover:-translate-y-0.5 hover:shadow-lg",
				destructive:
					"border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100",
				outline: "am-btn-outline active:shadow-none",
				secondary:
					"border border-slate-200/90 bg-slate-100/72 text-slate-800 shadow-sm shadow-slate-950/5 hover:bg-white",
				ghost: "border border-transparent text-slate-700 hover:bg-slate-100/80",
				link: "text-cyan-700 underline-offset-4 hover:underline",
			},
			size: {
				default: "min-h-10 px-4 py-2",
				sm: "min-h-9 px-3 text-xs",
				lg: "min-h-11 px-6",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
