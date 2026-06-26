import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PortalFeedCard } from "@/components/portal-feed-card";
import {
	getPortalContentItems,
	isContentVisibleForAudience,
	isPlacementVisibleForAudience,
	PORTAL_CONTENT_QUERY_KEY,
	type PortalAudience,
	type PortalPlacement,
} from "@/lib/client-portal";

export function PortalMediaFeed({
	audience,
	placement,
	variant = "feed",
	trackRead = false,
}: {
	audience: PortalAudience;
	/** Optional: filter by placement */
	placement?: PortalPlacement;
	/** 'feed' = compact cards, 'desktop' = same feed cards in a section container */
	variant?: "feed" | "desktop";
	/** Fire POST /portal-content/:id/read on render (use in real portals, not previews) */
	trackRead?: boolean;
}) {
	const { data: items = [] } = useQuery({
		queryKey: PORTAL_CONTENT_QUERY_KEY,
		queryFn: () => getPortalContentItems(),
	});

	const visibleItems = useMemo(
		() =>
			items
				.filter((item) => isContentVisibleForAudience(item, audience))
				.filter((item) =>
					isPlacementVisibleForAudience(item.placement ?? "home", audience),
				)
				.filter((item) => !placement || (item.placement ?? "home") === placement)
				.sort(
					(a, b) =>
						Number(b.pinned) - Number(a.pinned) ||
						new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime(),
				),
		[items, audience, placement],
	);

	if (!visibleItems.length) {
		return (
			<div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
				<p className="text-sm font-medium text-gray-500">Пока нет публикаций</p>
				<p className="mt-1 text-xs text-gray-400">
					Новости и предложения появятся здесь, как только их опубликуют.
				</p>
			</div>
		);
	}

	const grid = (
		<div className="grid gap-3 sm:grid-cols-2">
			{visibleItems.map((item) => (
				<PortalFeedCard key={item.id} item={item} trackRead={trackRead} />
			))}
		</div>
	);

	if (variant === "desktop") {
		return (
			<section className="rounded-lg border border-gray-100 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-4 sm:px-6">
					<div>
						<h2 className="font-semibold text-gray-900">Медиацентр</h2>
						<p className="text-xs text-gray-500">Новости, объявления и предложения</p>
					</div>
					<span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
						{visibleItems.length}
					</span>
				</div>
				<div className="p-4 sm:p-6">{grid}</div>
			</section>
		);
	}

	return grid;
}
