import { useEffect, useRef } from "react";
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
import type { PortalContentItem, PortalContentType } from "@/lib/client-portal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const PORTAL_FEED_TYPE_LABELS: Record<PortalContentType, string> = {
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

export const PORTAL_FEED_TYPE_ICONS: Record<PortalContentType, ElementType> = {
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

interface PollState {
	options: string[];
	counts: number[];
	total: number;
	myVote: number | null;
}

export function PortalPollCard({ item }: { item: PortalContentItem }) {
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
							{voted && <span className="shrink-0 font-semibold">{pct}%</span>}
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

function useReadTrack(itemId: string, enabled: boolean) {
	const tracked = useRef(false);
	useEffect(() => {
		if (!enabled || tracked.current) return;
		tracked.current = true;
		api.post(`/portal-content/${itemId}/read`).catch(() => undefined);
	}, [itemId, enabled]);
}

export function PortalFeedCard({
	item,
	trackRead,
}: {
	item: PortalContentItem;
	trackRead?: boolean;
}) {
	const Icon = PORTAL_FEED_TYPE_ICONS[item.type];
	useReadTrack(item.id, trackRead ?? false);

	return (
		<article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30">
			<div className="mb-3 flex items-center justify-between gap-2">
				<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
					<Icon className="h-3.5 w-3.5" />
					{PORTAL_FEED_TYPE_LABELS[item.type]}
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
				<PortalPollCard item={item} />
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
