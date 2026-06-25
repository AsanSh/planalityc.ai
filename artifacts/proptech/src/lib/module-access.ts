import {
	canAccessDashboardTab,
	getDefaultDashboardTab,
	parseDashboardTabFromSearch,
	resolveDashboardTabs,
	type DashboardTabId,
} from "./dashboard-access";
import { parseCustomRoleId } from "./custom-role-id";
import { getDashboardTabModuleId, getRouteModuleId, getSettingsKeyModuleId, MODULE_REGISTRY } from "./module-registry";

export type ModuleId =
	| "construction"
	| "finance"
	| "rental"
	| "proptech"
	| "warehouse"
	| "reports"
	| "consolidated";

export const ALL_MODULE_IDS: ModuleId[] = MODULE_REGISTRY.map((m) => m.id);

/** Префиксы URL → модуль (должны совпадать с layout.tsx) */
export const MODULE_URL_PREFIXES: Record<ModuleId, string[]> =
	Object.fromEntries(MODULE_REGISTRY.map((m) => [m.id, m.routePrefixes])) as Record<ModuleId, string[]>;

const SYSTEM_ROLE_MODULES: Record<string, ModuleId[] | "all"> = {
	company_admin: "all",
	admin: "all",
	super_admin: "all",
	general_director: "all",
	executive_operations_director: "all",
	construction_director: ["construction", "warehouse", "proptech", "reports", "consolidated"],
	chief_accountant: ["finance", "construction", "rental", "reports", "consolidated"],
	construction_project_manager: ["construction", "warehouse", "reports", "consolidated"],
	commercial_director: ["proptech", "rental", "construction", "reports", "consolidated"],
	financial_director: ["finance", "construction", "rental", "reports", "consolidated"],
	finance_operations_specialist: ["finance", "reports", "consolidated"],
	rental_department_head: ["rental", "reports", "consolidated"],
	rental_specialist: ["rental", "consolidated"],
	sales_department_head: ["proptech", "construction", "reports", "consolidated"],
	pto_engineer: ["construction", "consolidated"],
	supply_specialist: ["warehouse", "construction", "consolidated"],
	lawyer: ["construction", "rental", "proptech", "reports", "consolidated"],
	cashier: ["finance", "construction", "rental", "consolidated"],
	rental_manager: ["rental"],
	sales_manager: ["proptech"],
	finance: ["finance"],
	staff: ["consolidated"],
	pto: ["construction"],
	engineer: ["construction"],
};

const PERMISSION_PREFIX_TO_MODULE: Record<string, ModuleId> = {
	properties: getSettingsKeyModuleId("properties") ?? "consolidated",
	users: getSettingsKeyModuleId("users") ?? "consolidated",
	rental: getSettingsKeyModuleId("rental") ?? "rental",
	construction: getSettingsKeyModuleId("construction") ?? "construction",
	finance: getSettingsKeyModuleId("finance") ?? "finance",
	counterparties: getSettingsKeyModuleId("counterparties") ?? "consolidated",
	settings: getSettingsKeyModuleId("settings") ?? "consolidated",
	admin: getSettingsKeyModuleId("admin") ?? "consolidated",
	warehouse: getSettingsKeyModuleId("warehouse") ?? "warehouse",
	reports: getSettingsKeyModuleId("reports") ?? "reports",
};

const DEFAULT_HOME_LEGACY: Record<string, string> = {
	pto: "/construction/chess",
	engineer: "/construction/chess",
};

function moduleFromDashboardPath(path: string): ModuleId | null {
	const qIdx = path.indexOf("?");
	if (qIdx === -1) return null;
	const pathOnly = path.slice(0, qIdx);
	if (pathOnly !== "/dashboard") return null;
	const tab = new URLSearchParams(path.slice(qIdx)).get("tab");
	if (tab) return getDashboardTabModuleId(tab as DashboardTabId);
	return "consolidated";
}

export function detectModuleFromPath(path: string): ModuleId {
	const fromDashboard = moduleFromDashboardPath(path);
	if (fromDashboard) return fromDashboard;

	const pathOnly = path.split("?")[0] ?? path;
	return getRouteModuleId(pathOnly) ?? "consolidated";
}

export function resolveAllowedModules(
	role: string,
	permissions: string[] = [],
): ModuleId[] {
	if (!role) return ["consolidated"];

	const system = SYSTEM_ROLE_MODULES[role];
	if (system === "all") return ALL_MODULE_IDS;
	if (system) return system;

	const customId = parseCustomRoleId(role);
	if (customId || permissions.length > 0) {
		if (permissions.includes("admin.all")) return ALL_MODULE_IDS;
		const modules = new Set<ModuleId>();
		for (const perm of permissions) {
			const prefix = perm.split(".")[0];
			const mod = PERMISSION_PREFIX_TO_MODULE[prefix];
			if (mod) modules.add(mod);
		}
		if (modules.size > 0) return [...modules];
	}

	return ["consolidated"];
}

export function getDefaultHomePath(
	role: string,
	allowedModules: ModuleId[],
	permissions: string[] = [],
): string {
	if (DEFAULT_HOME_LEGACY[role]) return DEFAULT_HOME_LEGACY[role];
	const tabs = resolveDashboardTabs(role, permissions, allowedModules);
	if (tabs.length > 0) {
		const tab = getDefaultDashboardTab(role, tabs, allowedModules);
		return `/dashboard?tab=${tab}`;
	}
	return "/dashboard";
}

export function canAccessPath(
	path: string,
	allowedModules: ModuleId[],
	role = "",
	permissions: string[] = [],
): boolean {
	if (path === "/" || path === "/login" || path === "/register") return true;

	const pathOnly = path.split("?")[0] ?? path;
	const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";

	if (
		pathOnly === "/settings" ||
		pathOnly.startsWith("/settings/") ||
		pathOnly === "/design-system" ||
		pathOnly === "/activity" ||
		pathOnly === "/import"
	) {
		return canAccessSystemSettings(role, permissions);
	}

	if (pathOnly === "/users") {
		return canManageUsers(role, permissions);
	}

	if (pathOnly === "/dashboard" || path.startsWith("/dashboard?")) {
		const tabs = resolveDashboardTabs(role, permissions, allowedModules);
		if (tabs.length === 0) return false;
		const tab = parseDashboardTabFromSearch(
			search || (path.includes("?") ? path.slice(path.indexOf("?")) : ""),
		);
		if (!tab) return true;
		return canAccessDashboardTab(tab, role, permissions, allowedModules);
	}

	// Legacy dashboard URLs — доступны всем с соответствующей вкладкой (редирект в App)
	const legacyTabMap: Record<string, DashboardTabId> = {
			"/rental/dashboard": "rental",
			"/construction/dashboard": "finance",
			"/crm/dashboard": "sales",
			"/warehouse/dashboard": "supply",
		};
	if (legacyTabMap[pathOnly]) {
		return canAccessDashboardTab(
			legacyTabMap[pathOnly],
			role,
			permissions,
			allowedModules,
		);
	}

	const moduleId = detectModuleFromPath(pathOnly);
	return allowedModules.includes(moduleId);
}

export function isFullAdmin(role: string): boolean {
	return role === "company_admin" || role === "admin";
}

export function canAccessSystemSettings(
	role: string,
	permissions: string[] = [],
): boolean {
	if (["company_admin", "admin", "super_admin"].includes(role)) return true;
	if (permissions.includes("admin.all")) return true;
	return permissions.some((permission) =>
		["settings.write", "settings.roles", "settings.legal_entities"].includes(permission),
	);
}

export function canManageUsers(
	role: string,
	permissions: string[] = [],
): boolean {
	if (canAccessSystemSettings(role, permissions)) return true;
	return permissions.some((permission) =>
		["users.read", "users.write", "users.delete"].includes(permission),
	);
}
