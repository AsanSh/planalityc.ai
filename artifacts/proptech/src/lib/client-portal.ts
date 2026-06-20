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
const CONTENT_KEY = "planalityc.clientPortal.media.v1";

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

export function getPortalContentItems() {
	return readJson<PortalContentItem[]>(CONTENT_KEY, []);
}

export function savePortalContentItems(items: PortalContentItem[]) {
	writeJson(CONTENT_KEY, items);
}

export function createPortalContentItem(
	input: Omit<PortalContentItem, "id" | "createdAt" | "updatedAt">,
) {
	const now = new Date().toISOString();
	const item: PortalContentItem = {
		...input,
		id: `portal-media-${Date.now()}`,
		createdAt: now,
		updatedAt: now,
	};
	savePortalContentItems([item, ...getPortalContentItems()]);
	return item;
}

export function updatePortalContentItem(id: string, input: Partial<PortalContentItem>) {
	const items = getPortalContentItems();
	const next = items.map((item) =>
		item.id === id ? { ...item, ...input, updatedAt: new Date().toISOString() } : item,
	);
	savePortalContentItems(next);
	return next.find((item) => item.id === id) ?? null;
}

export function deletePortalContentItem(id: string) {
	savePortalContentItems(getPortalContentItems().filter((item) => item.id !== id));
}

export function isContentVisibleForAudience(item: PortalContentItem, audience: PortalAudience) {
	if (item.status !== "published") return false;
	if (item.audience !== "all" && item.audience !== audience) return false;
	const now = Date.now();
	if (new Date(item.publishAt).getTime() > now) return false;
	if (item.expiresAt && new Date(item.expiresAt).getTime() < now) return false;
	return true;
}
