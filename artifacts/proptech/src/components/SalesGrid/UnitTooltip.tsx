import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MAX_W = 280;

export function UnitTooltip({
	anchor,
	lines,
	visible,
}: {
	anchor: DOMRect | null;
	lines: string[];
	visible: boolean;
}) {
	const tipRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		if (!visible || !anchor || !tipRef.current) return;
		const tip = tipRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		let top = anchor.bottom + GAP;
		let left = anchor.left + anchor.width / 2 - tip.width / 2;

		if (top + tip.height > vh - GAP) {
			top = anchor.top - tip.height - GAP;
		}
		if (left < GAP) left = GAP;
		if (left + tip.width > vw - GAP) left = vw - tip.width - GAP;
		if (top < GAP) top = GAP;

		setPos({ top, left });
	}, [visible, anchor, lines.join("\n")]);

	if (!visible || !anchor || lines.length === 0) return null;

	return createPortal(
		<div
			ref={tipRef}
			role="tooltip"
			className="pointer-events-none fixed z-[9999] rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 text-xs text-white shadow-xl"
			style={{
				top: pos.top,
				left: pos.left,
				maxWidth: MAX_W,
			}}
		>
			{lines.map((line, i) => (
				<p key={i} className={i > 0 ? "mt-0.5 text-slate-300" : "font-semibold"}>
					{line}
				</p>
			))}
		</div>,
		document.body,
	);
}
