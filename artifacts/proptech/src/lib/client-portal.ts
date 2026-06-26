import { api } from "./api";

export type PortalAudience =
	| "all"
	| "buyers"
	| "tenants"
	| "investors"
	| "contractors"
	| "suppliers";

export type PortalContentType =
	| "news"
	| "announcement"
	| "poll"
	| "promotion"
	| "closed_sale"
	| "broadcast"
	| "service"
	| "club_task"
	| "construction_update"
	| "property_catalog";

export type PortalPlacement =
	| "home"
	| "my_home"
	| "services"
	| "club"
	| "catalog"
	| "documents";

export type PortalContentStatus = "draft" | "published" | "archived";

export interface PortalAccessRecord {
	id: string;
	counterpartyId: number;
	counterpartyName: string;
	roles: string[];
	phone?: string | null;
	email?: string | null;
	enabled: boolean;
	portalKind: "buyer" | "tenant" | "investor" | "contractor" | "supplier";
	portalPath: string;
	login: string;
	enabledAt?: string;
	updatedAt: string;
}

export interface PortalContentItem {
	id: string;
	type: PortalContentType;
	status: PortalContentStatus;
	audience: PortalAudience;
	placement?: PortalPlacement;
	title: string;
	body: string;
	projectName?: string;
	imageUrl?: string;
	priceLabel?: string;
	rewardPoints?: number;
	ctaLabel?: string;
	ctaUrl?: string;
	pollOptions?: string[];
	pinned: boolean;
	publishAt: string;
	expiresAt?: string;
	createdAt: string;
	updatedAt: string;
}

// ── DB-row type as returned by /portal-access ────────────────────────────────
interface PortalAccessDbRow {
	id: number;
	companyId: number;
	counterpartyId: number;
	portalKind: string;
	accessCode: string | null;
	isActive: boolean;
	meta: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

// ── Portal Access — authoritative store is the DB ────────────────────────────
// localStorage is used only as an ephemeral cache for the current session
// (so that callers that need a synchronous first-render value can get one).

const CACHE_KEY = "planalityc.clientPortal.accessCache.v2";

function readCache(): PortalAccessRecord[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(CACHE_KEY);
		return raw ? (JSON.parse(raw) as PortalAccessRecord[]) : [];
	} catch {
		return [];
	}
}

function writeCache(records: PortalAccessRecord[]) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(CACHE_KEY, JSON.stringify(records));
}

function dbRowToRecord(row: PortalAccessDbRow): PortalAccessRecord {
	const kind = row.portalKind as PortalAccessRecord["portalKind"];
	return {
		id: String(row.id),
		counterpartyId: row.counterpartyId,
		counterpartyName: (row.meta as Record<string, unknown>)?.counterpartyName as string ?? "",
		roles: ((row.meta as Record<string, unknown>)?.roles as string[]) ?? [],
		phone: (row.meta as Record<string, unknown>)?.phone as string | null ?? null,
		email: (row.meta as Record<string, unknown>)?.email as string | null ?? null,
		enabled: row.isActive,
		portalKind: kind,
		portalPath: getPortalPath(kind),
		login: (row.meta as Record<string, unknown>)?.login as string ?? `client-${row.counterpartyId}`,
		enabledAt: (row.meta as Record<string, unknown>)?.enabledAt as string | undefined,
		updatedAt: row.updatedAt,
	};
}

export function resolvePortalKind(roles: string[] = []): PortalAccessRecord["portalKind"] {
	if (roles.includes("tenant")) return "tenant";
	if (roles.includes("landlord")) return "investor";
	if (roles.includes("subcontractor") || roles.includes("service_provider")) return "contractor";
	if (roles.includes("material_supplier")) return "supplier";
	return "buyer";
}

export function getPortalPath(kind: PortalAccessRecord["portalKind"]) {
	const paths: Record<PortalAccessRecord["portalKind"], string> = {
		buyer: "/buyer-portal",
		tenant: "/tenant-portal",
		investor: "/investor-portal",
		contractor: "/contractor-portal",
		supplier: "/supplier-portal",
	};
	return paths[kind];
}

/** Fetch all portal access records from the DB. Updates cache. */
export async function getPortalAccessRecords(): Promise<PortalAccessRecord[]> {
	try {
		const { data } = await api.get<PortalAccessDbRow[]>("/portal-access");
		const records = (Array.isArray(data) ? data : []).map(dbRowToRecord);
		writeCache(records);
		return records;
	} catch {
		// Fallback to cache if API unavailable (e.g. unauthenticated portal view)
		return readCache();
	}
}

/** Get a single portal access record from the DB (or cache). Async. */
export async function getPortalAccess(counterpartyId: number): Promise<PortalAccessRecord | undefined> {
	const records = await getPortalAccessRecords();
	return records.find((r) => r.counterpartyId === counterpartyId);
}

/** Upsert a portal access record in the DB. Keeps cache in sync. */
export async function upsertPortalAccess(input: {
	counterpartyId: number;
	counterpartyName: string;
	roles: string[];
	phone?: string | null;
	email?: string | null;
	enabled: boolean;
}): Promise<PortalAccessRecord> {
	const portalKind = resolvePortalKind(input.roles);
	const login = input.email || input.phone || `client-${input.counterpartyId}`;
	const now = new Date().toISOString();

	// Carry over enabledAt from cache if it already existed
	const cached = readCache().find((r) => r.counterpartyId === input.counterpartyId);

	const { data } = await api.post<PortalAccessDbRow>("/portal-access", {
		counterpartyId: input.counterpartyId,
		portalKind,
		isActive: input.enabled,
		meta: {
			counterpartyName: input.counterpartyName,
			roles: input.roles,
			phone: input.phone ?? null,
			email: input.email ?? null,
			login,
			enabledAt: input.enabled ? (cached?.enabledAt ?? now) : cached?.enabledAt,
		},
	});

	const record = dbRowToRecord(data);

	// Update the local cache
	const existing = readCache();
	writeCache([
		record,
		...existing.filter((r) => r.counterpartyId !== input.counterpartyId),
	]);

	return record;
}

/** Synchronous read from cache only — for initial render before async data arrives. */
export function getPortalAccessSync(counterpartyId: number): PortalAccessRecord | undefined {
	return readCache().find((r) => r.counterpartyId === counterpartyId);
}

// ── Portal content (медиацентр) — backed by API ──────────────────────────────

function toIso(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return value;
	try {
		return new Date(value as string).toISOString();
	} catch {
		return "";
	}
}

/** Map a raw DB row (numeric id, Date columns) to the PortalContentItem shape. */
function mapPortalContentRow(row: Record<string, unknown>): PortalContentItem {
	return {
		id: String(row.id),
		type: (row.type as PortalContentType) ?? "news",
		status: (row.status as PortalContentStatus) ?? "draft",
		audience: (row.audience as PortalAudience) ?? "all",
		placement: (row.placement as PortalPlacement) ?? undefined,
		title: (row.title as string) ?? "",
		body: (row.body as string) ?? "",
		projectName: (row.projectName as string) ?? undefined,
		imageUrl: (row.imageUrl as string) ?? undefined,
		priceLabel: (row.priceLabel as string) ?? undefined,
		rewardPoints: row.rewardPoints == null ? undefined : Number(row.rewardPoints),
		ctaLabel: (row.ctaLabel as string) ?? undefined,
		ctaUrl: (row.ctaUrl as string) ?? undefined,
		pollOptions: Array.isArray(row.pollOptions) ? (row.pollOptions as string[]) : undefined,
		pinned: Boolean(row.pinned),
		publishAt: toIso(row.publishAt),
		expiresAt: row.expiresAt ? toIso(row.expiresAt) : undefined,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt),
	};
}

export const PORTAL_CONTENT_QUERY_KEY = ["portal-content"] as const;

export async function getPortalContentItems(params?: {
	audience?: PortalAudience;
	status?: PortalContentStatus;
}): Promise<PortalContentItem[]> {
	const { data } = await api.get<Record<string, unknown>[]>("/portal-content", {
		params: {
			audience: params?.audience,
			status: params?.status,
		},
	});
	return (Array.isArray(data) ? data : []).map(mapPortalContentRow);
}

export async function createPortalContentItem(
	input: Omit<PortalContentItem, "id" | "createdAt" | "updatedAt">,
): Promise<PortalContentItem> {
	const { data } = await api.post<Record<string, unknown>>("/portal-content", input);
	return mapPortalContentRow(data);
}

export async function updatePortalContentItem(
	id: string,
	input: Omit<PortalContentItem, "id" | "createdAt" | "updatedAt">,
): Promise<PortalContentItem> {
	const { data } = await api.put<Record<string, unknown>>(`/portal-content/${id}`, input);
	return mapPortalContentRow(data);
}

export async function deletePortalContentItem(id: string): Promise<void> {
	await api.delete(`/portal-content/${id}`);
}

export function isContentVisibleForAudience(item: PortalContentItem, audience: PortalAudience) {
	if (item.status !== "published") return false;
	if (item.audience !== "all" && item.audience !== audience) return false;
	const now = Date.now();
	if (new Date(item.publishAt).getTime() > now) return false;
	if (item.expiresAt && new Date(item.expiresAt).getTime() < now) return false;
	return true;
}
