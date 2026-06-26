import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	HardHat,
	Megaphone,
	Newspaper,
	Percent,
	Radio,
	Send,
	Vote,
	Wrench,
} from "lucide-react";
import type { ElementType } from "react";
import { useMemo } from "react";
import {
	getPortalContentItems,
	isContentVisibleForAudience,
	PORTAL_CONTENT_QUERY_KEY,
	type PortalAudience,
	type PortalContentItem,
	type PortalContentType,
	type PortalPlacement,
} from "@/lib/client-portal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<PortalContentType, string> = {
	news: "Новость",
	announcement: "Объявление",
	poll: "Опрос",
	promotion: "Реклама",
	closed_sale: "Закрытая продажа",
	broadcast: "Рассылка",
	service: "Услуга",
	club_task: "Закрытый клуб / бонусы",
	construction_update: "Ход строительства",
	property_catalog: "Каталог ЖК",
};

const TYPE_ICONS: Record<PortalContentType, ElementType> = {
	news: Newspaper,
	announcement: Megaphone,
	poll: Vote,
	promotion: Percent,
	closed_sale: Radio,
	broadcast: Send,
	service: Wrench,
	club_task: Radio,
	construction_update: HardHat,
	property_catalog: Building2,
};

// ---- Poll state per item ----
interface PollState {
	options: string[];
	counts: number[];
	total: number;
	myVote: number | null;
}

function PollCard({ item }: { item: PortalContentItem }) {
	const queryClient = useQueryClient();
	const pollKey = ["portal-poll", item.id];

	const { data: pollState } = useQuery<PollState>({
		queryKey: pollKey,
		queryFn: () =>
			api.get<PollState>(`/portal-content/${item.id}/poll`).then((r) => r.data),
		staleTime: 30_000,
		retry: 1,
	});

	const voteMut = useMutation({
		mutationFn: (optionIndex: number) =>
			api
				.post<{ counts: number[]; total: number; myVote: number }>(
					`/portal-content/${item.id}/vote`,
					{ optionIndex },
				)
				.then((r) => r.data),
		onSuccess: (data) => {
			queryClient.setQueryData<PollState>(pollKey, (prev) =>
				prev
					? { ...prev, counts: data.counts, total: data.total, myVote: data.myVote }
					: prev,
			);
		},
	});

	// Use poll options from server if loaded, fall back to item.pollOptions
	const options = pollState?.options ?? item.pollOptions ?? [];
	const counts = pollState?.counts;
	const total = pollState?.total ?? 0;
	const myVote = pollState?.myVote ?? null;
	const voted = myVote !== null;

	if (!options.length) return null;

	return (
		<div className="mt-3 space-y-2">
			{options.map((option, index) => {
				const count = counts?.[index] ?? 0;
				const pct = total > 0 ? Math.round((count / total) * 100) : 0;
				const isMyVote = voted && myVote === index;
				return (
					<button
						key={option}
						type="button"
						disabled={voted || voteMut.isPending}
						onClick={() => !voted && voteMut.mutate(index)}
						className={cn(
							"relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs font-medium transition",
							isMyVote
								? "border-sky-400 bg-sky-50 text-sky-800"
								: voted
									? "border-gray-100 bg-gray-50 text-gray-600"
									: "border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50/50",
						)}
					>
						{voted && (
							<span
								className={cn(
									"absolute inset-y-0 left-0 rounded-l-lg transition-all",
									isMyVote ? "bg-sky-200/60" : "bg-gray-200/50",
								)}
								style={{ width: `${pct}%` }}
							/>
						)}
						<span className="relative flex items-center justify-between gap-2">
							<span>{option}</span>
							{voted && (
								<span className="shrink-0 font-semibold">
									{pct}%
								</span>
							)}
						</span>
					</button>
				);
			})}
			{total > 0 && (
				<p className="text-[10px] text-gray-400">{total} голос(ов)</p>
			)}
		</div>
	);
}

// ---- Read-tracking hook ----
function useReadTrack(itemId: string, enabled: boolean) {
	const tracked = useRef(false);
	useEffect(() => {
		if (!enabled || tracked.current) return;
		tracked.current = true;
		// best-effort, ignore errors
		api.post(`/portal-content/${itemId}/read`).catch(() => undefined);
	}, [itemId, enabled]);
}

// ---- Single feed item card ----
function FeedCard({
	item,
	trackRead,
}: {
	item: PortalContentItem;
	trackRead?: boolean;
}) {
	const Icon = TYPE_ICONS[item.type];
	useReadTrack(item.id, trackRead ?? false);

	return (
		<article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30">
			<div className="mb-3 flex items-center justify-between gap-2">
				<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
					<Icon className="h-3.5 w-3.5" />
					{TYPE_LABELS[item.type]}
				</span>
				{item.pinned && (
					<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
						Важно
					</span>
				)}
			</div>
			{item.imageUrl && (
				<div className="mb-3 overflow-hidden rounded-lg">
					<img
						src={item.imageUrl}
						alt={item.title}
						className="h-36 w-full object-cover"
					/>
				</div>
			)}
			<h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
			<p className="mt-1 line-clamp-3 text-sm text-gray-600">{item.body}</p>

			{item.type === "poll" ? (
				<PollCard item={item} />
			) : item.pollOptions?.length ? (
				<div className="mt-3 space-y-1.5">
					{item.pollOptions.slice(0, 3).map((option) => (
						<div
							key={option}
							className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700"
						>
							{option}
						</div>
					))}
				</div>
			) : null}

			{item.ctaLabel && item.ctaUrl && (
				<a
					href={item.ctaUrl}
					target="_blank"
					rel="noreferrer"
					className="mt-3 inline-flex rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
				>
					{item.ctaLabel}
				</a>
			)}
		</article>
	);
}

// ---- Public component ----
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
				<FeedCard key={item.id} item={item} trackRead={trackRead} />
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
