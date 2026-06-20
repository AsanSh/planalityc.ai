import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { KpiFilter, SalesGridUnit, UnitsStats } from "./types";

export function useSalesGridUnits(
	projectId: number | null,
	opts?: { status?: KpiFilter; search?: string },
) {
	const status = opts?.status && opts.status !== "all" ? opts.status : undefined;
	const search = opts?.search?.trim() || undefined;

	return useQuery<SalesGridUnit[]>({
		queryKey: ["sales-grid-units", projectId, status, search],
		queryFn: async () => {
			const { data } = await api.get<SalesGridUnit[]>(
				`/construction/projects/${projectId}/units`,
				{ params: { status, search } },
			);
			return data;
		},
		enabled: !!projectId,
	});
}

export function useSalesGridStats(projectId: number | null) {
	return useQuery<UnitsStats>({
		queryKey: ["sales-grid-stats", projectId],
		queryFn: async () => {
			const { data } = await api.get<UnitsStats>(
				`/construction/projects/${projectId}/units/stats`,
			);
			return data;
		},
		enabled: !!projectId,
	});
}

/** Fallback: старый эндпоинт, если новый недоступен */
export function useLegacyUnits(projectId: number | null) {
	return useQuery<SalesGridUnit[]>({
		queryKey: ["construction-units", projectId],
		queryFn: async () => {
			const { data } = await api.get<SalesGridUnit[]>("/construction/units", {
				params: { projectId: String(projectId) },
			});
			return data;
		},
		enabled: !!projectId,
	});
}
