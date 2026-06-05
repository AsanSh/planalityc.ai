import { lazy, Suspense, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { DashboardScopeBar } from "@/components/dashboard/DashboardScopeBar";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardScopeProvider } from "@/hooks/use-dashboard-scope";
import { useDashboardAccess } from "@/hooks/use-dashboard-access";
import {
	DASHBOARD_TAB_LABELS,
	parseDashboardTabFromSearch,
	type DashboardTabId,
} from "@/lib/dashboard-access";
import { parseScopeFromSearch, scopeToSearchParams } from "@/lib/dashboard-scope";
import { cn } from "@/lib/utils";
import {
	BarChart3,
	Building2,
	ChartNoAxesCombined,
	CircleDollarSign,
	Factory,
	Home,
	Landmark,
	LayoutDashboard,
} from "lucide-react";

const ControlCenterTab = lazy(() => import("../consolidated-dashboard"));
const ConstructionOpsTab = lazy(() => import("./tabs/construction-ops-tab"));
const FinanceTab = lazy(() => import("../construction/dashboard"));
const SupplyTab = lazy(() => import("../warehouse/dashboard"));
const SalesTab = lazy(() => import("../crm/dashboard"));
const InvestorsTab = lazy(() => import("./tabs/investors-tab"));
const RentalTab = lazy(() => import("../rental/rental-dashboard"));
const AnalyticsTab = lazy(() => import("./tabs/analytics-tab"));

function TabFallback() {
	return <Skeleton className="h-64 w-full rounded-xl" />;
}

const TAB_PANELS: Record<DashboardTabId, React.ComponentType> = {
	control: ControlCenterTab,
	construction: ConstructionOpsTab,
	finance: FinanceTab,
	supply: SupplyTab,
	sales: SalesTab,
	investors: InvestorsTab,
	rental: RentalTab,
	analytics: AnalyticsTab,
};

const TAB_ICONS: Record<DashboardTabId, React.ComponentType<{ className?: string }>> = {
	control: LayoutDashboard,
	construction: Building2,
	finance: Landmark,
	supply: Factory,
	sales: CircleDollarSign,
	investors: ChartNoAxesCombined,
	rental: Home,
	analytics: BarChart3,
};

export default function UnifiedDashboard() {
	const { allowedTabs, primaryTabs, defaultTab, isLoading, hasDashboard } = useDashboardAccess();
	const search = useSearch();
	const [, setLocation] = useLocation();

	const requested = parseDashboardTabFromSearch(search);
	const activeTab: DashboardTabId =
		requested && allowedTabs.includes(requested) ? requested : defaultTab;

	useEffect(() => {
		if (isLoading || !hasDashboard) return;
		if (!requested || !allowedTabs.includes(requested)) {
			const qs = scopeToSearchParams(parseScopeFromSearch(search));
			qs.set("tab", activeTab);
			setLocation(`/dashboard?${qs.toString()}`, { replace: true });
		}
	}, [isLoading, hasDashboard, requested, allowedTabs, activeTab, search, setLocation]);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full max-w-3xl" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (!hasDashboard) {
		return (
			<div className="py-16 text-center text-gray-500">
				<p className="text-sm">Нет доступа к обзору. Обратитесь к администратору.</p>
			</div>
		);
	}

	const visibleTabs = primaryTabs.length > 0 ? primaryTabs : allowedTabs;

	const setTab = (tab: DashboardTabId) => {
		const qs = scopeToSearchParams(parseScopeFromSearch(search));
		qs.set("tab", tab);
		setLocation(`/dashboard?${qs.toString()}`);
	};

	const ActivePanel = TAB_PANELS[activeTab];

	return (
		<DashboardScopeProvider>
			<div className="space-y-4 -mt-1">
			<div className="sr-only">
				<h1>Обзор</h1>
				<p>{DASHBOARD_TAB_LABELS[activeTab]}</p>
			</div>

			{visibleTabs.length > 1 && (
				<div
					className="flex w-fit max-w-full gap-1 rounded-2xl border border-slate-200 bg-white/85 p-1 shadow-sm backdrop-blur overflow-x-auto scrollbar-thin"
					role="tablist"
					aria-label="Разделы обзора"
				>
					{visibleTabs.map((tab) => {
						const Icon = TAB_ICONS[tab];
						return (
							<button
								key={tab}
								type="button"
								role="tab"
								aria-label={DASHBOARD_TAB_LABELS[tab]}
								title={DASHBOARD_TAB_LABELS[tab]}
								aria-selected={activeTab === tab}
								onClick={() => setTab(tab)}
								className={cn(
									"group relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition-all duration-200",
									activeTab === tab
										? "bg-slate-950 text-cyan-300 shadow-lg shadow-slate-900/15"
										: "hover:bg-slate-100 hover:text-slate-900",
								)}
							>
								<Icon className="h-5 w-5" />
								<span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
									{DASHBOARD_TAB_LABELS[tab]}
								</span>
							</button>
						);
					})}
				</div>
			)}

			{activeTab === "control" && <DashboardScopeBar />}

			<div role="tabpanel" className="min-h-[320px]">
				<Suspense fallback={<TabFallback />}>
					<ActivePanel />
				</Suspense>
			</div>
		</div>
		</DashboardScopeProvider>
	);
}
