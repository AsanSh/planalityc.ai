import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	BadgeDollarSign,
	Building2,
	LayoutDashboard,
	Percent,
	Sparkles,
	TrendingUp,
	UserRound,
	Wallet,
} from "lucide-react";
import {
	PortalKpi,
	PortalPageTitle,
	PortalShell,
	type PortalNavItem,
} from "@/components/portal/portal-shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fmt(n: any) {
	const num = parseFloat(n ?? 0);
	return num.toLocaleString("ru-KG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const NAV: PortalNavItem[] = [
	{ id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
	{ id: "objects", label: "Объекты", icon: Building2 },
	{ id: "finance", label: "Финансы", icon: Wallet },
	{ id: "analytics", label: "Аналитика", icon: TrendingUp },
	{ id: "profile", label: "Профиль", icon: UserRound },
];

export default function InvestorPortal({ previewInvestorId }: { previewInvestorId?: number } = {}) {
	const { user, logout } = useAuth();
	const isPreview = !!previewInvestorId;
	const [section, setSection] = useState("dashboard");

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-investor-preview", previewInvestorId] : ["portal-investor-me"],
		queryFn: () =>
			api
				.get(isPreview ? `/portal/investor/preview/${previewInvestorId}` : "/portal/investor/me")
				.then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const investor = data?.investor;
	const investments: any[] = data?.investments ?? [];
	const distributions: any[] = data?.distributions ?? [];
	const currency = investments[0]?.currency ?? "KGS";

	const totalInvested = investments.reduce((s, i) => s + parseFloat(i.capitalInvested || 0), 0);
	const totalReceived = distributions.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
	const roi = totalInvested > 0 ? (totalReceived / totalInvested) * 100 : 0;
	const balance = totalInvested - totalReceived;

	const userName = isPreview
		? investor?.fullName || "Инвестор"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || investor?.fullName || "Инвестор";

	// Объединённый реестр (акт сверки): вложения и выплаты по датам
	const ledger = useMemo(() => {
		const rows = [
			...investments.map((i) => ({
				date: i.investedAt || i.createdAt,
				label: `Вложение · ${i.propertyName || "объект"}`,
				invested: parseFloat(i.capitalInvested || 0),
				received: 0,
			})),
			...distributions.map((d) => ({
				date: d.date || d.distributedAt || d.createdAt,
				label: d.description || "Выплата дохода",
				invested: 0,
				received: parseFloat(d.amount || 0),
			})),
		].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
		let run = 0;
		return rows.map((r) => {
			run += r.invested - r.received;
			return { ...r, balance: run };
		});
	}, [investments, distributions]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
			</div>
		);
	}

	if (!isPreview && !investor) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
				<div className="max-w-md text-center">
					<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
						<Building2 className="h-7 w-7 text-teal-600" />
					</div>
					<h1 className="mb-2 text-xl font-bold text-gray-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к инвестиционному профилю. Как только менеджер откроет
						доступ, здесь появятся ваш портфель, выплаты и акт сверки.
					</p>
				</div>
			</div>
		);
	}

	return (
		<PortalShell
			brandSub="Портал инвестора"
			userName={userName}
			isPreview={isPreview}
			onLogout={logout}
			nav={NAV}
			active={section}
			onNavigate={setSection}
		>
			{section === "dashboard" && (
				<>
					<PortalPageTitle title={`Добрый день, ${userName.split(" ")[0]}`} subtitle="Обзор вашего инвестиционного портфеля." />
					<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
						<PortalKpi icon={Wallet} label="Вложено" value={`${fmt(totalInvested)} ${currency}`} sub={`${investments.length} объект(а)`} />
						<PortalKpi icon={BadgeDollarSign} label="Получено выплат" value={`${fmt(totalReceived)} ${currency}`} sub={`${distributions.length} транзакций`} accent="text-emerald-600 bg-emerald-50" />
						<PortalKpi icon={Percent} label="Доходность" value={`${roi.toFixed(1)}%`} sub="к вложениям" accent="text-amber-600 bg-amber-50" />
						<PortalKpi icon={TrendingUp} label="Текущий баланс" value={`${fmt(balance)} ${currency}`} sub={balance > 0 ? "тело инвестиций" : "выплачено полностью"} accent="text-sky-600 bg-sky-50" />
					</div>

					<div className="mt-5 flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50">
							<Sparkles className="h-5 w-5 text-teal-600" />
						</span>
						<div>
							<p className="text-sm font-semibold text-gray-900">AI-рекомендация</p>
							<p className="mt-1 text-sm text-gray-600">
								{roi >= 8
									? "Доходность портфеля выше типичной для класса — рассмотрите реинвестирование выплат."
									: "Портфель в активной фазе. Регулярные выплаты помогают планировать денежный поток."}
							</p>
						</div>
					</div>

					<h2 className="mb-3 mt-7 text-lg font-bold text-gray-900">Последние выплаты</h2>
					<div className="divide-y overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
						{distributions.length === 0 && (
							<div className="py-10 text-center text-sm text-gray-500">Выплат пока нет</div>
						)}
						{distributions.slice(0, 6).map((d, idx) => (
							<div key={d.id ?? idx} className="flex items-center justify-between px-5 py-4">
								<div>
									<p className="font-semibold text-gray-900">{d.description || "Выплата дохода"}</p>
									<p className="text-xs text-gray-500">{fmtDate(d.date || d.distributedAt || "")}</p>
								</div>
								<p className="font-bold text-emerald-600">+{fmt(d.amount)} {d.currency || currency}</p>
							</div>
						))}
					</div>
				</>
			)}

			{section === "objects" && (
				<>
					<PortalPageTitle title="Мои объекты" subtitle="Управляйте вашим портфелем недвижимости." />
					<div className="space-y-4">
						{investments.length === 0 && (
							<div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
								Объектов пока нет
							</div>
						)}
						{investments.map((inv, idx) => (
							<div key={inv.id ?? idx} className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
									<Building2 className="h-6 w-6 text-teal-600" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-bold text-gray-900">
										{inv.propertyName || "Объект"}
										{inv.propertyUnit ? ` · ${inv.propertyUnit}` : ""}
									</p>
									<p className="text-xs text-gray-500">Вложено: {fmtDate(inv.investedAt || "")}</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-500">Доля</p>
									<p className="font-bold text-gray-900">{inv.sharePercent ?? 0}%</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-500">Вложено</p>
									<p className="font-bold text-gray-900">{fmt(inv.capitalInvested)} {inv.currency || currency}</p>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{section === "finance" && (
				<>
					<PortalPageTitle title="Финансы" subtitle="Вложения, выплаты и акт сверки." />
					<div className="grid gap-4 sm:grid-cols-3">
						<PortalKpi icon={Wallet} label="Вложено" value={`${fmt(totalInvested)} ${currency}`} />
						<PortalKpi icon={BadgeDollarSign} label="Получено" value={`${fmt(totalReceived)} ${currency}`} accent="text-emerald-600 bg-emerald-50" />
						<PortalKpi icon={TrendingUp} label="Сальдо" value={`${fmt(balance)} ${currency}`} accent="text-sky-600 bg-sky-50" />
					</div>

					<h2 className="mb-3 mt-7 text-lg font-bold text-gray-900">Акт сверки</h2>
					<div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-4 py-3 font-medium">Дата</th>
										<th className="px-4 py-3 font-medium">Операция</th>
										<th className="px-4 py-3 text-right font-medium">Вложено</th>
										<th className="px-4 py-3 text-right font-medium">Получено</th>
										<th className="px-4 py-3 text-right font-medium">Баланс</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{ledger.length === 0 && (
										<tr><td colSpan={5} className="py-10 text-center text-gray-500">Операций пока нет</td></tr>
									)}
									{ledger.map((r, idx) => (
										<tr key={idx} className="hover:bg-gray-50/80">
											<td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmtDate(r.date || "")}</td>
											<td className="px-4 py-3 text-gray-800">{r.label}</td>
											<td className="px-4 py-3 text-right text-gray-900">{r.invested ? fmt(r.invested) : "—"}</td>
											<td className="px-4 py-3 text-right text-emerald-600">{r.received ? fmt(r.received) : "—"}</td>
											<td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{fmt(r.balance)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}

			{section === "analytics" && (
				<>
					<PortalPageTitle title="Аналитика портфеля" subtitle="Распределение вложений по объектам." />
					<div className="space-y-3">
						{investments.length === 0 && (
							<div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
								Нет данных для аналитики
							</div>
						)}
						{investments.map((inv, idx) => {
							const share = totalInvested > 0 ? (parseFloat(inv.capitalInvested || 0) / totalInvested) * 100 : 0;
							return (
								<div key={inv.id ?? idx} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
									<div className="mb-2 flex items-center justify-between">
										<p className="font-semibold text-gray-900">{inv.propertyName || "Объект"}{inv.propertyUnit ? ` · ${inv.propertyUnit}` : ""}</p>
										<p className="text-sm font-bold text-gray-900">{fmt(inv.capitalInvested)} {inv.currency || currency}</p>
									</div>
									<div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
										<div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500" style={{ width: `${Math.min(share, 100)}%` }} />
									</div>
									<p className="mt-1.5 text-xs text-gray-500">{share.toFixed(1)}% портфеля · доля в объекте {inv.sharePercent ?? 0}%</p>
								</div>
							);
						})}
					</div>
				</>
			)}

			{section === "profile" && (
				<>
					<PortalPageTitle title="Профиль" subtitle="Данные инвестора." />
					<div className="max-w-lg space-y-2 rounded-2xl border border-gray-100 bg-white p-5 text-sm shadow-sm">
						<div className="flex justify-between gap-3 border-b border-gray-50 pb-2">
							<span className="text-gray-500">Имя</span>
							<span className="font-medium text-gray-900">{investor?.fullName || userName}</span>
						</div>
						<div className="flex justify-between gap-3 border-b border-gray-50 pb-2">
							<span className="text-gray-500">Телефон</span>
							<span className="font-medium text-gray-900">{investor?.phone || "—"}</span>
						</div>
						<div className="flex justify-between gap-3">
							<span className="text-gray-500">E-mail</span>
							<span className="font-medium text-gray-900">{investor?.email || user?.email || "—"}</span>
						</div>
					</div>
				</>
			)}
		</PortalShell>
	);
}
