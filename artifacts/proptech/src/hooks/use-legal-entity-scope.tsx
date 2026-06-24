/**
 * Reusable legal-entity (ОсОО) scope for FINANCE pages.
 *
 * Mirrors the dashboard scope pattern (see use-dashboard-scope.tsx) but is
 * standalone: it reads/writes only the `legalEntityId` query param on the
 * CURRENT route, so any finance page can opt in without coupling to /dashboard.
 *
 * - `legalEntityId === null` means "all"/group → callers MUST omit the param.
 * - `apiParam` is a ready-to-spread helper for api.get({ params }) and for the
 *   TanStack queryKey, so refetch happens on change.
 */

import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

export type LegalEntityScope = {
	/** Selected ОсОО id, or null for "all"/group. */
	legalEntityId: number | null;
	/** Set/clear the selected ОсОО (null = all). Persists to the URL. */
	setLegalEntityId: (id: number | null) => void;
	/**
	 * Param object for api.get({ params }). Empty when scope = all, so the
	 * `?legalEntityId=` query is omitted automatically.
	 */
	apiParam: { legalEntityId?: string };
	/**
	 * Stable value for the TanStack queryKey (number | null). Include this in
	 * the queryKey so queries refetch when the scope changes.
	 */
	queryKeyPart: number | null;
};

function parseLegalEntityId(search: string): number | null {
	const qs = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	);
	const raw = qs.get("legalEntityId");
	if (!raw || raw === "all") return null;
	const id = parseInt(raw, 10);
	return Number.isFinite(id) ? id : null;
}

export function useLegalEntityScope(): LegalEntityScope {
	const search = useSearch();
	const [location, setLocation] = useLocation();

	const legalEntityId = useMemo(() => parseLegalEntityId(search), [search]);

	const setLegalEntityId = useCallback(
		(id: number | null) => {
			const qs = new URLSearchParams(
				search.startsWith("?") ? search.slice(1) : search,
			);
			if (id == null) qs.delete("legalEntityId");
			else qs.set("legalEntityId", String(id));
			const str = qs.toString();
			setLocation(str ? `${location}?${str}` : location);
		},
		[search, location, setLocation],
	);

	return useMemo(
		() => ({
			legalEntityId,
			setLegalEntityId,
			apiParam:
				legalEntityId != null
					? { legalEntityId: String(legalEntityId) }
					: {},
			queryKeyPart: legalEntityId,
		}),
		[legalEntityId, setLegalEntityId],
	);
}
