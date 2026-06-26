import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
	canAccessPath,
	getDefaultHomePath,
	resolveAllowedModules,
	type ModuleId,
} from "@/lib/module-access";
import { parseCustomRoleId } from "@/lib/custom-role-id";
import { MATRIX_JOB_LABELS } from "@/lib/user-roles";
import {
	isModuleIntegrationEnabled,
	settingsKeysToModuleIds,
	type ModuleIntegrationId,
} from "@/lib/module-registry";

interface CompanyRoleRow {
	id: number;
	name: string;
	permissions: string[];
	isActive: boolean;
}

export function useModuleAccess() {
	const { user } = useAuth();
	const role = user?.role ?? "";
	const customRoleId = parseCustomRoleId(role);

	const { data: roles = [], isLoading } = useQuery<CompanyRoleRow[]>({
		queryKey: ["company-roles"],
		queryFn: () => api.get("/roles").then((r) => r.data),
		enabled: !!user,
		staleTime: 60_000,
	});

	const { data: enabledKeys, isLoading: modulesLoading } = useQuery<string[]>({
		queryKey: ["enabled-modules"],
		queryFn: () => api.get("/modules/enabled").then((r) => r.data),
		enabled: !!user,
		staleTime: 60_000,
		retry: false,
	});

	const permissions = useMemo(() => {
		let row: CompanyRoleRow | undefined;
		if (customRoleId !== null) {
			row = roles.find((r) => r.id === customRoleId);
		} else {
			const matrixRoleName = MATRIX_JOB_LABELS[role];
			if (matrixRoleName) {
				const normalized = matrixRoleName.trim().toLowerCase();
				row = roles.find((r) => r.name.trim().toLowerCase() === normalized);
			}
		}
		return Array.isArray(row?.permissions) ? row.permissions : [];
	}, [customRoleId, role, roles]);

	const allowedModules = useMemo(() => {
		const byRole = resolveAllowedModules(role, permissions);
		const byCompany = settingsKeysToModuleIds(enabledKeys);
		if (!byCompany) return byRole;
		if (MATRIX_JOB_LABELS[role] || permissions.length > 0) {
			for (const moduleId of byRole) {
				if (!byCompany.includes(moduleId)) byCompany.push(moduleId);
			}
		}
		if (byRole.includes("consolidated") && !byCompany.includes("consolidated")) {
			byCompany.push("consolidated");
		}
		if (
			["company_admin", "admin", "super_admin"].includes(role) &&
			byRole.includes("rental") &&
			!byCompany.includes("rental")
		) {
			byCompany.push("rental");
		}
		const filtered = byRole.filter((moduleId) => byCompany.includes(moduleId));
		return filtered.length > 0 ? filtered : byRole;
	}, [role, permissions, enabledKeys]);

	const homePath = useMemo(
		() => getDefaultHomePath(role, allowedModules, permissions),
		[role, allowedModules, permissions],
	);

	return {
		isLoading: (!!user && isLoading) || (!!user && modulesLoading),
		role,
		permissions,
		allowedModules,
		homePath,
		canAccess: (path: string) =>
			canAccessPath(path, allowedModules, role, permissions),
		hasModule: (moduleId: ModuleId) => allowedModules.includes(moduleId),
		canUseIntegration: (integrationId: ModuleIntegrationId) =>
			isModuleIntegrationEnabled(allowedModules, integrationId),
	};
}
