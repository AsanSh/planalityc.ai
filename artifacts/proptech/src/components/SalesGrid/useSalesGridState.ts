import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CellViewMode, KpiFilter, SalesGridView } from "./types";

export function useSalesGridState(userRole: string) {
	const isAdmin = ["admin", "super_admin", "company_admin", "owner"].includes(userRole);
	const isCommercialDirector = userRole === "commercial_director";
	const isSalesOnly = userRole === "sales_manager";
	const forcedPto = userRole === "pto" || userRole === "engineer";

	const [adminMode, setAdminMode] = useState<CellViewMode>(() => {
		const urlMode = new URLSearchParams(window.location.search).get("mode") as CellViewMode | null;
		const validModes: CellViewMode[] = ["crm", "pto", "prices"];
		return urlMode && validModes.includes(urlMode) ? urlMode : "crm";
	});
	const cellViewMode: CellViewMode = forcedPto
		? "pto"
		: isCommercialDirector
			? "prices"
			: isAdmin
				? adminMode
				: "crm";

	const isPTO = cellViewMode === "pto";
	const isPricingMode = cellViewMode === "prices";

	const isMobile = useIsMobile();
	const [view, setView] = useState<SalesGridView>("grid");
	const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
	const [search, setSearch] = useState("");
	const [blockFilter, setBlockFilter] = useState("all");
	const [panelUnitId, setPanelUnitId] = useState<number | null>(null);
	const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(() => new Set());
	const [bulkFloor, setBulkFloor] = useState<number | null>(null);

	const [projectId, setProjectId] = useState<number | null>(() => {
		const raw = new URLSearchParams(window.location.search).get("projectId");
		const parsed = raw ? Number(raw) : NaN;
		return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
	});

	useEffect(() => {
		if (isMobile) setView("list");
	}, [isMobile]);

	useEffect(() => {
		setPanelUnitId(null);
		setBulkSelectedIds(new Set());
		setBulkFloor(null);
	}, [projectId]);

	const effectiveView = useMemo(
		() => (isMobile ? "list" : view),
		[isMobile, view],
	);

	return {
		projectId,
		setProjectId,
		view,
		setView,
		effectiveView,
		kpiFilter,
		setKpiFilter,
		search,
		setSearch,
		blockFilter,
		setBlockFilter,
		panelUnitId,
		setPanelUnitId,
		bulkSelectedIds,
		setBulkSelectedIds,
		bulkFloor,
		setBulkFloor,
		cellViewMode,
		adminMode,
		setAdminMode,
		isAdmin,
		isCommercialDirector,
		isSalesOnly,
		isPTO,
		isPricingMode,
		isMobile,
	};
}
