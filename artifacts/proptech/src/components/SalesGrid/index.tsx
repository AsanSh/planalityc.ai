import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckSquare,
	Download,
	Layers,
	MoreVertical,
	Plus,
	Search,
	Settings2,
	Square,
	Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChessUnitsImportDialog } from "@/components/chess-units-import-dialog";
import { ChessStatusSettingsDialog } from "@/components/chess-status-settings-dialog";
import { BulkCommercialPriceDialog } from "@/components/bulk-commercial-price-dialog";
import { UnitCommercialPriceDialog } from "@/components/unit-commercial-price-dialog";
import { UnitSaleDialog } from "@/components/unit-sale-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { exportChessUnitsCsv } from "@/lib/chess-grid-export";
import {
	downloadUnitsTemplate,
	exportUnitsToExcel,
} from "@/lib/chess-units-xlsx";
import { canManageUnitPricing, isUnitPublishedForSale } from "@/lib/unit-pricing";
import {
	badgeCfgFor,
	buildStatusBadgeCfg,
	buildStatusGridCfg,
	type UnitStatusDto,
} from "@/lib/unit-statuses";
import {
	BulkGenerateDialog,
	PtoEditAreaDialog,
	UnitDialog,
	type ChessDialogUnit,
} from "@/pages/construction/chess-dialogs";
import { AgentsView } from "./AgentsView";
import { FloorGrid } from "./FloorGrid";
import { KpiRow } from "./KpiRow";
import { ListView } from "./ListView";
import { UnitDrawer } from "./UnitDrawer";
import { useLegacyUnits, useSalesGridStats, useSalesGridUnits } from "./useUnits";
import { useSalesGridState } from "./useSalesGridState";
import { ViewSwitcher } from "./ViewSwitcher";
import {
	kpiBucket,
	type SalesGridProject,
	type SalesGridUnit,
	type UnitsAreaStats,
	type UnitsStats,
} from "./types";

function computeStatsFromUnits(units: SalesGridUnit[]): UnitsStats {
	const stats: UnitsStats = {
		total: units.length,
		free: 0,
		reserved: 0,
		sold: 0,
		settled: 0,
		building: 0,
		closed: 0,
	};
	for (const u of units) {
		stats[kpiBucket(u.status)] += 1;
	}
	return stats;
}

function computeAreaStatsFromUnits(units: SalesGridUnit[]): UnitsAreaStats {
	const stats: UnitsAreaStats = {
		all: 0,
		free: 0,
		reserved: 0,
		sold: 0,
		settled: 0,
		building: 0,
		closed: 0,
	};
	for (const u of units) {
		const area = parseFloat(String(u.area ?? "0"));
		if (!Number.isFinite(area) || area <= 0) continue;
		const bucket = kpiBucket(u.status);
		stats.all += area;
		stats[bucket] += area;
	}
	return stats;
}

export default function SalesGrid() {
	const qc = useQueryClient();
	const { toast } = useToast();
	const { user } = useAuth();
	const userRole = (user as { role?: string })?.role ?? "";

	const state = useSalesGridState(userRole);
	const {
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
	} = state;

	const canEditPrices = canManageUnitPricing(userRole);
	const canEditArea = canEditPrices || isPTO || (isAdmin && adminMode === "pto");
	const canBulkFloor = canEditPrices;

	const [selectedUnit, setSelectedUnit] = useState<ChessDialogUnit | null | "new">(null);
	const [ptoEditUnit, setPtoEditUnit] = useState<ChessDialogUnit | null>(null);
	const [commercialPriceUnit, setCommercialPriceUnit] = useState<SalesGridUnit | null>(null);
	const [showBulkPricing, setShowBulkPricing] = useState(false);
	const [saleFlow, setSaleFlow] = useState<{
		unit: ChessDialogUnit;
		status: "reserved" | "sold";
	} | null>(null);
	const [showBulk, setShowBulk] = useState(false);
	const [showImport, setShowImport] = useState(false);
	const [showStatusSettings, setShowStatusSettings] = useState(false);
	const [seeding, setSeeding] = useState(false);

	const { data: unitStatuses = [] } = useQuery<UnitStatusDto[]>({
		queryKey: ["construction-unit-statuses"],
		queryFn: () => api.get("/construction/unit-statuses").then((r) => r.data),
	});

	const statusGridMap = buildStatusGridCfg(unitStatuses);
	const statusBadgeMap = buildStatusBadgeCfg(unitStatuses);
	const terminateContractMut = useMutation({
		mutationFn: (contractId: number) =>
			api
				.patch(`/construction/contracts-sales/${contractId}`, { status: "cancelled" })
				.then((r) => r.data),
		onSuccess: () => {
			toast({ title: "Договор расторгнут" });
			invalidateAll();
			qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
			qc.invalidateQueries({ queryKey: ["construction-accruals"] });
		},
		onError: (err: unknown) => {
			toast({
				title: "Не удалось расторгнуть договор",
				description: getApiErrorMessage(err, "Попробуйте открыть договор и изменить статус вручную"),
				variant: "destructive",
			});
		},
	});

	const { data: projects = [] } = useQuery<SalesGridProject[]>({
		queryKey: ["construction-projects"],
		queryFn: () => api.get<SalesGridProject[]>("/construction/projects/all").then((r) => r.data),
	});

	useEffect(() => {
		if (projectId != null) return;
		if (projects.length > 0) setProjectId(projects[0].id);
	}, [projectId, projects, setProjectId]);

	const gridUnitsQuery = useSalesGridUnits(projectId, {
		status: kpiFilter,
		search,
	});
	const allUnitsQuery = useSalesGridUnits(projectId);
	const legacyUnitsQuery = useLegacyUnits(projectId);
	const useLegacy = gridUnitsQuery.isError && !gridUnitsQuery.isLoading;

	const rawUnits = useLegacy ? legacyUnitsQuery.data : gridUnitsQuery.data;
	const unitsLoading = useLegacy ? legacyUnitsQuery.isLoading : gridUnitsQuery.isLoading;

	const statsQuery = useSalesGridStats(projectId);
	const stats = statsQuery.isError
		? computeStatsFromUnits(rawUnits ?? [])
		: statsQuery.data;
	const areaStats = computeAreaStatsFromUnits(
		allUnitsQuery.isError ? (legacyUnitsQuery.data ?? []) : (allUnitsQuery.data ?? []),
	);

	const selectedProject = projects.find((p) => p.id === projectId);

	const filteredUnits = useMemo(() => {
		let list = rawUnits ?? [];
		if (useLegacy && kpiFilter !== "all") {
			list = list.filter((u) => kpiBucket(u.status) === kpiFilter);
		}
		if (useLegacy && search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter(
				(u) =>
					u.unitNumber.toLowerCase().includes(q) ||
					(u.block || "").toLowerCase().includes(q) ||
					(u.contract?.buyerName || "").toLowerCase().includes(q),
			);
		}
		if (blockFilter !== "all") {
			list = list.filter((u) => (u.block || "Без секции") === blockFilter);
		}
		if (isSalesOnly) {
			list = list.filter((u) => isUnitPublishedForSale(u));
		}
		return list;
	}, [rawUnits, useLegacy, kpiFilter, search, blockFilter, isSalesOnly]);

	const blocks = useMemo(
		() => [
			"all",
			...Array.from(new Set((rawUnits ?? []).map((u) => u.block || "Без секции"))),
		],
		[rawUnits],
	);

	const panelUnit = useMemo(
		() => filteredUnits.find((u) => u.id === panelUnitId) ?? null,
		[filteredUnits, panelUnitId],
	);

	const invalidateAll = () => {
		qc.invalidateQueries({ queryKey: ["sales-grid-units", projectId] });
		qc.invalidateQueries({ queryKey: ["sales-grid-stats", projectId] });
		qc.invalidateQueries({ queryKey: ["construction-units", projectId] });
	};

	const refreshAll = async () => {
		invalidateAll();
		await Promise.allSettled([
			gridUnitsQuery.refetch(),
			legacyUnitsQuery.refetch(),
			statsQuery.refetch(),
		]);
	};

	const handleMoveUnit = async (unitId: number, toFloor: number) => {
		try {
			await api.patch(`/construction/units/${unitId}`, { floor: toFloor });
			invalidateAll();
		} catch (e) {
			toast({ title: getApiErrorMessage(e, "Не удалось переместить юнит"), variant: "destructive" });
		}
	};

	const openUnit = (u: SalesGridUnit) => {
		if (isSalesOnly && !isUnitPublishedForSale(u)) {
			toast({
				title: "Объект не открыт для продажи",
				variant: "destructive",
			});
			return;
		}
		setPanelUnitId((prev) => (prev === u.id ? null : u.id));
	};

	const toggleBulkUnit = (id: number) => {
		setBulkFloor(null);
		setBulkSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleBulkFloor = (floor: number, ids: number[]) => {
		setBulkFloor(floor);
		setBulkSelectedIds((prev) => {
			const all = ids.every((id) => prev.has(id));
			const next = new Set(prev);
			if (all) ids.forEach((id) => next.delete(id));
			else ids.forEach((id) => next.add(id));
			return next;
		});
	};

	const clearBulk = () => {
		setBulkSelectedIds(new Set());
		setBulkFloor(null);
	};

	const bulkPublish = async () => {
		const ids = Array.from(bulkSelectedIds);
		if (!projectId || ids.length === 0) return;
		if (!confirm(`Открыть ${ids.length} объект(ов) для продажи?`)) return;
		try {
			const { data } = await api.post<{ updated: number; total: number }>(
				"/construction/units/bulk-pricing",
				{ projectId, unitIds: ids, publishForSale: true },
			);
			toast({ title: `Открыто: ${data.updated} из ${data.total}` });
			clearBulk();
			await refreshAll();
		} catch (e) {
			toast({ title: getApiErrorMessage(e), variant: "destructive" });
		}
	};

	const handleExportExcel = () => {
		if (!selectedProject || filteredUnits.length === 0) {
			toast({ title: "Нет данных", variant: "destructive" });
			return;
		}
		exportUnitsToExcel(
			filteredUnits.map((u) => ({
				unitNumber: u.unitNumber,
				floor: u.floor,
				block: u.block,
				unitType: u.unitType,
				roomCount: u.roomCount,
				area: u.area,
				pricePerSqm: u.pricePerSqm,
				totalPrice: u.totalPrice,
				currency: u.currency,
				status: u.status,
				notes: u.notes,
				buyerName: u.contract?.buyerName,
				contractTotal: u.contract?.totalAmount,
				paidAmount: u.contract?.paidAmount,
				remainingAmount: u.contract?.remainingAmount,
			})),
			selectedProject.name,
		);
		toast({ title: "Excel скачан" });
	};

	const handleAreaSave = async (unit: SalesGridUnit, newArea: number) => {
		try {
			if (isPTO) {
				await api.patch(`/construction/units/${unit.id}/area`, {
					area: newArea,
					reason: "Список квартир",
				});
			} else {
				await api.patch(`/construction/units/${unit.id}`, {
					area: newArea,
					recalcPrice: true,
				});
			}
			toast({ title: "Площадь сохранена" });
			await refreshAll();
		} catch (e) {
			toast({ title: getApiErrorMessage(e), variant: "destructive" });
			throw e;
		}
	};

	const handlePriceSave = async (unit: SalesGridUnit, pricePerSqm: number) => {
		try {
			await api.patch(`/construction/units/${unit.id}/pricing`, {
				basePricePerSqm: pricePerSqm,
				saleCoefficient: 1,
				isPublishedForSale: unit.isPublishedForSale !== false,
			});
			toast({ title: "Цена сохранена" });
			await refreshAll();
		} catch (e) {
			toast({ title: getApiErrorMessage(e), variant: "destructive" });
			throw e;
		}
	};

	const handleExportCsv = () => {
		if (filteredUnits.length === 0) return;
		exportChessUnitsCsv(filteredUnits, (code) => badgeCfgFor(statusBadgeMap, code).label);
		toast({ title: "CSV скачан" });
	};

	const seedFromProject = async () => {
		if (!projectId) return;
		setSeeding(true);
		try {
			const { data } = await api.post<{ unitsCreated: number }>(
				`/construction/projects/${projectId}/generate-units`,
			);
			toast({ title: "Шахматка создана", description: `${data.unitsCreated} квартир` });
			await refreshAll();
		} catch (e) {
			toast({ title: getApiErrorMessage(e, "Ошибка"), variant: "destructive" });
		} finally {
			setSeeding(false);
		}
	};

	const commercialResolved =
		commercialPriceUnit &&
		(filteredUnits.find((u) => u.id === commercialPriceUnit.id) || commercialPriceUnit);

	return (
		<div className="flex min-h-0 flex-col">
			{/* TOPBAR 52px sticky */}
			<header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
				<Link href="/" className="hidden shrink-0 text-sm font-black text-slate-900 sm:block">
					Planalityc
				</Link>
				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
					<select
						className="h-8 max-w-[180px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
						value={projectId ?? ""}
						onChange={(e) => setProjectId(Number(e.target.value) || null)}
					>
						{projects.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
					{isAdmin && (
						<div className="flex shrink-0 gap-0.5 rounded-lg bg-slate-100 p-0.5">
							{(["crm", "pto", "prices"] as const).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setAdminMode(m)}
									className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
										adminMode === m
											? "bg-white text-slate-900 shadow-sm"
											: "text-slate-500"
									}`}
								>
									{m === "crm" ? "CRM" : m === "pto" ? "ПТО" : "Цены"}
								</button>
							))}
						</div>
					)}
					<div className="relative hidden min-w-[140px] flex-1 sm:block max-w-xs">
						<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
						<Input
							className="h-8 pl-8 text-xs"
							placeholder="Поиск №, секция, покупатель…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					{projectId && !isSalesOnly && (
						<Button
							variant="outline"
							size="sm"
							className="hidden h-8 gap-1 text-xs md:inline-flex"
							onClick={() => setShowBulk(true)}
						>
							<Layers className="h-3.5 w-3.5" />
							Заполнить
						</Button>
					)}
					{projectId && !isSalesOnly && (
						<Button
							size="sm"
							className="h-8 gap-1 bg-amber-500 text-xs hover:bg-orange-600"
							onClick={() => setSelectedUnit("new")}
						>
							<Plus className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Квартира</span>
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{!isSalesOnly && (
								<DropdownMenuItem onClick={() => setShowStatusSettings(true)}>
									<Settings2 className="mr-2 h-4 w-4" />
									Статусы
								</DropdownMenuItem>
							)}
							{projectId && !isSalesOnly && (
								<>
									<DropdownMenuItem onClick={() => downloadUnitsTemplate(selectedProject?.name)}>
										<Download className="mr-2 h-4 w-4" />
										Шаблон Excel
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setShowImport(true)}>
										<Upload className="mr-2 h-4 w-4" />
										Импорт
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => void seedFromProject()} disabled={seeding}>
										<Layers className="mr-2 h-4 w-4" />
										Сгенерировать из проекта
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
				{!projectId ? (
					<div className="py-20 text-center text-slate-500">Выберите проект</div>
				) : (
					<>
						<KpiRow stats={stats} areaStats={areaStats} active={kpiFilter} onSelect={setKpiFilter} />

						{isPricingMode && (
							<div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2">
								<span className="text-xs text-slate-700">
									Выбрано: <strong>{bulkSelectedIds.size}</strong>
									{bulkFloor != null ? ` · этаж ${bulkFloor}` : ""}
									<span className="ml-1 text-slate-500">· ПКМ или двойной тап</span>
								</span>
								<Button
									size="sm"
									disabled={bulkSelectedIds.size === 0}
									onClick={() => setShowBulkPricing(true)}
								>
									<CheckSquare className="mr-1 h-3.5 w-3.5" />
									Применить цену
								</Button>
								<Button
									size="sm"
									variant="secondary"
									disabled={bulkSelectedIds.size === 0}
									onClick={() => void bulkPublish()}
								>
									На продажу
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={bulkSelectedIds.size === 0}
									onClick={clearBulk}
								>
									<Square className="mr-1 h-3.5 w-3.5" />
									Снять
								</Button>
							</div>
						)}

						<div className="flex flex-wrap items-center gap-2">
							<select
								className="h-8 rounded-lg border border-slate-200 px-2 text-xs"
								value={blockFilter}
								onChange={(e) => setBlockFilter(e.target.value)}
							>
								{blocks.map((b) => (
									<option key={b} value={b}>
										{b === "all" ? "Все секции" : b}
									</option>
								))}
							</select>
							<div className="flex-1" />
							<ViewSwitcher
								view={effectiveView}
								onChange={setView}
								isMobile={isMobile}
								onExportCsv={handleExportCsv}
								onExportExcel={handleExportExcel}
								onImport={
									projectId && !isSalesOnly
										? () => setShowImport(true)
										: undefined
								}
							/>
						</div>

						<div className="flex min-h-0 gap-4">
							<div className="min-w-0 flex-1">
								{unitsLoading ? (
									<div className="py-16 text-center text-sm text-slate-500">Загрузка…</div>
								) : filteredUnits.length === 0 ? (
									<div className="rounded-xl border border-dashed py-16 text-center text-sm text-slate-500">
										Нет квартир по фильтрам
										{!isSalesOnly && (
											<div className="mt-3">
												<Button size="sm" variant="outline" onClick={() => setShowBulk(true)}>
													Заполнить шахматку
												</Button>
											</div>
										)}
									</div>
								) : effectiveView === "grid" ? (
									<FloorGrid
										units={filteredUnits}
										statusGridMap={statusGridMap}
										cellViewMode={cellViewMode}
										isSalesOnly={isSalesOnly}
										panelUnitId={panelUnitId}
										bulkSelectedIds={bulkSelectedIds}
										showBulkCheckbox={isPricingMode}
										onOpenUnit={openUnit}
										onBulkToggle={toggleBulkUnit}
										onBulkFloor={toggleBulkFloor}
									onMoveUnit={handleMoveUnit}
								/>
								) : effectiveView === "list" ? (
									<ListView
										units={filteredUnits}
										statusBadgeMap={statusBadgeMap}
										onSelect={openUnit}
										canEditArea={canEditArea}
										onAreaSave={canEditArea ? handleAreaSave : undefined}
										canEditPrice={canEditPrices}
										onPriceSave={canEditPrices ? handlePriceSave : undefined}
									/>
								) : (
									<AgentsView
										units={filteredUnits}
										statusBadgeMap={statusBadgeMap}
										onSelectUnit={openUnit}
									/>
								)}
							</div>

							{panelUnit && !isMobile && (
								<UnitDrawer
									unit={panelUnit}
									project={selectedProject}
									open
									statusBadgeMap={statusBadgeMap}
									isPTO={isPTO}
									isPricingMode={isPricingMode}
									isSalesOnly={isSalesOnly}
									canEditPrices={canEditPrices}
									canBulkFloor={canBulkFloor}
									onClose={() => setPanelUnitId(null)}
									onEdit={() => setSelectedUnit(panelUnit as ChessDialogUnit)}
									onEditArea={() => setPtoEditUnit(panelUnit as ChessDialogUnit)}
									onConfigurePrice={() => setCommercialPriceUnit(panelUnit)}
									onRequestSale={(status) => {
										setSaleFlow({ unit: panelUnit as ChessDialogUnit, status });
										setPanelUnitId(null);
									}}
									onTerminateContract={(contractId) => {
										if (confirm("Расторгнуть договор и освободить юнит?")) {
											terminateContractMut.mutate(contractId);
										}
									}}
									onSaved={() => void refreshAll()}
								/>
							)}
						</div>
					</>
				)}
			</div>

			{panelUnit && isMobile && (
				<UnitDrawer
					unit={panelUnit}
					project={selectedProject}
					open
					statusBadgeMap={statusBadgeMap}
					isPTO={isPTO}
					isPricingMode={isPricingMode}
					isSalesOnly={isSalesOnly}
					canEditPrices={canEditPrices}
					canBulkFloor={canBulkFloor}
					onClose={() => setPanelUnitId(null)}
					onEdit={() => setSelectedUnit(panelUnit as ChessDialogUnit)}
					onEditArea={() => setPtoEditUnit(panelUnit as ChessDialogUnit)}
					onConfigurePrice={() => setCommercialPriceUnit(panelUnit)}
					onRequestSale={(status) => {
						setSaleFlow({ unit: panelUnit as ChessDialogUnit, status });
						setPanelUnitId(null);
					}}
					onTerminateContract={(contractId) => {
						if (confirm("Расторгнуть договор и освободить юнит?")) {
							terminateContractMut.mutate(contractId);
						}
					}}
					onSaved={() => void refreshAll()}
				/>
			)}

			{selectedUnit && projectId && (
				<UnitDialog
					unit={selectedUnit}
					projectId={projectId}
					statuses={unitStatuses}
					statusGridMap={statusGridMap}
					salesOnly={isSalesOnly}
					onClose={() => setSelectedUnit(null)}
					onSaved={invalidateAll}
					onRequestSale={(status, unit) => {
						setSelectedUnit(null);
						setSaleFlow({ unit, status });
					}}
				/>
			)}
			{commercialResolved && selectedProject && (
				<UnitCommercialPriceDialog
					open
					unit={commercialResolved as ChessDialogUnit}
					project={selectedProject}
					onClose={() => setCommercialPriceUnit(null)}
					onSaved={() => {
						invalidateAll();
						qc.invalidateQueries({ queryKey: ["construction-projects"] });
					}}
				/>
			)}
			{showBulkPricing && projectId && selectedProject && (
				<BulkCommercialPriceDialog
					open={showBulkPricing}
					project={selectedProject}
					projectId={projectId}
					unitIds={Array.from(bulkSelectedIds)}
					floorLabel={bulkFloor != null ? `${bulkFloor}эт` : null}
					onClose={() => setShowBulkPricing(false)}
					onSaved={() => {
						clearBulk();
						invalidateAll();
					}}
				/>
			)}
			<ChessStatusSettingsDialog
				open={showStatusSettings}
				onClose={() => setShowStatusSettings(false)}
			/>
			{saleFlow && (
				<UnitSaleDialog
					open
					unit={saleFlow.unit}
					unitStatus={saleFlow.status}
					onClose={() => setSaleFlow(null)}
					onSaved={() => {
						invalidateAll();
						qc.invalidateQueries({ queryKey: ["construction-contracts-sales"] });
					}}
				/>
			)}
			{showBulk && projectId && (
				<BulkGenerateDialog
					projectId={projectId}
					onClose={() => setShowBulk(false)}
					onSaved={invalidateAll}
				/>
			)}
			{showImport && projectId && selectedProject && (
				<ChessUnitsImportDialog
					open={showImport}
					projectId={projectId}
					projectName={selectedProject.name}
					areaOnly={canEditArea && !isPTO}
					onClose={() => setShowImport(false)}
					onImported={invalidateAll}
				/>
			)}
			<PtoEditAreaDialog
				unit={ptoEditUnit}
				open={!!ptoEditUnit}
				hideFinancials={isPTO && userRole !== "admin"}
				onClose={() => setPtoEditUnit(null)}
				onSaved={invalidateAll}
			/>
		</div>
	);
}
