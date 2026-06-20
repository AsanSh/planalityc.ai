import { Building2, HardHat, Megaphone, Newspaper, Percent, Radio, Send, Vote, Wrench } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	getPortalContentItems,
	isContentVisibleForAudience,
	type PortalAudience,
	type PortalContentItem,
	type PortalContentType,
} from "@/lib/client-portal";

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

export function PortalMediaFeed({ audience }: { audience: PortalAudience }) {
	const [items, setItems] = useState<PortalContentItem[]>(() => getPortalContentItems());

	useEffect(() => {
		const sync = () => setItems(getPortalContentItems());
		window.addEventListener("storage", sync);
		window.addEventListener("planalityc:portal-storage", sync as EventListener);
		return () => {
			window.removeEventListener("storage", sync);
			window.removeEventListener("planalityc:portal-storage", sync as EventListener);
		};
	}, []);

	const visibleItems = useMemo(
		() =>
			items
				.filter((item) => isContentVisibleForAudience(item, audience))
				.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()),
		[items, audience],
	);

	if (!visibleItems.length) return null;

	return (
		<section className="rounded-lg border border-gray-100 bg-white shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-4 sm:px-6">
				<div>
					<h2 className="font-semibold text-gray-900">Медиацентр</h2>
					<p className="text-xs text-gray-500">Новости, объявления и предложения для клиента</p>
				</div>
				<span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
					{visibleItems.length}
				</span>
			</div>
			<div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
				{visibleItems.slice(0, 6).map((item) => {
					const Icon = TYPE_ICONS[item.type];
					return (
						<article
							key={item.id}
							className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30"
						>
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
							<h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
							<p className="mt-1 line-clamp-3 text-sm text-gray-600">{item.body}</p>
							{item.pollOptions?.length ? (
								<div className="mt-3 space-y-1.5">
									{item.pollOptions.slice(0, 3).map((option) => (
										<div key={option} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
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
				})}
			</div>
		</section>
	);
}
