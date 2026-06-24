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

const ACCESS_KEY = "planalityc.clientPortal.access.v1";

function readJson<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function writeJson<T>(key: string, value: T) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(key, JSON.stringify(value));
	window.dispatchEvent(new CustomEvent("planalityc:portal-storage", { detail: { key } }));
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

export function getPortalAccessRecords() {
	return readJson<PortalAccessRecord[]>(ACCESS_KEY, []);
}

export function savePortalAccessRecords(records: PortalAccessRecord[]) {
	writeJson(ACCESS_KEY, records);
}

export function getPortalAccess(counterpartyId: number) {
	return getPortalAccessRecords().find((record) => record.counterpartyId === counterpartyId);
}

export function upsertPortalAccess(input: {
	counterpartyId: number;
	counterpartyName: string;
	roles: string[];
	phone?: string | null;
	email?: string | null;
	enabled: boolean;
}) {
	const now = new Date().toISOString();
	const records = getPortalAccessRecords();
	const current = records.find((record) => record.counterpartyId === input.counterpartyId);
	const portalKind = resolvePortalKind(input.roles);
	const next: PortalAccessRecord = {
		id: current?.id ?? `portal-access-${input.counterpartyId}`,
		counterpartyId: input.counterpartyId,
		counterpartyName: input.counterpartyName,
		roles: input.roles,
		phone: input.phone,
		email: input.email,
		enabled: input.enabled,
		portalKind,
		portalPath: getPortalPath(portalKind),
		login: input.email || input.phone || `client-${input.counterpartyId}`,
		enabledAt: input.enabled ? (current?.enabledAt ?? now) : current?.enabledAt,
		updatedAt: now,
	};
	savePortalAccessRecords([
		next,
		...records.filter((record) => record.counterpartyId !== input.counterpartyId),
	]);
	return next;
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
