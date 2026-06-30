import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	BarChart3,
	Building2,
	FileText,
	LayoutDashboard,
	TrendingUp,
	UserRound,
	Wallet,
	LayoutGrid,
} from "lucide-react";
import {
	PortalAiTip,
	PortalKpi,
	PortalPageTitle,
	PortalShell,
	type PortalNavItem,
} from "@/components/portal/portal-shell";
import { PortalCurrencyProvider, usePortalCurrency } from "@/lib/portal-currency";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fmtDate(d: string) {
	if (!d) return "—";
	const t = new Date(d);
	return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const NAV: PortalNavItem[] = [
	{ id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
	{ id: "objects", label: "Объекты", icon: Building2 },
	{ id: "finance", label: "Финансы", icon: Wallet },
	{ id: "documents", label: "Документы", icon: FileText },
	{ id: "analytics", label: "Аналитика", icon: BarChart3 },
	{ id: "services", label: "Сервисы", icon: LayoutGrid },
	{ id: "profile", label: "Профиль", icon: UserRound },
];

function AreaChart({ points }: { points: { value: number }[] }) {
	if (points.length < 2) {
		return <div className="flex h-44 items-center justify-center text-sm text-gray-400">Недостаточно данных для графика</div>;
	}
	const w = 720;
	const h = 200;
	const pad = 8;
	const max = Math.max(...points.map((p) => p.value), 1);
	const stepX = (w - pad * 2) / (points.length - 1);
	const coords = points.map((p, i) => [pad + i * stepX, h - pad - (p.value / max) * (h - pad * 2)]);
	const line = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
	const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
	return (
		<svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" preserveAspectRatio="none">
			<defs>
				<linearGradient id="invArea" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#1f2937" stopOpacity="0.16" />
					<stop offset="100%" stopColor="#1f2937" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#invArea)" />
			<path d={line} fill="none" stroke="#1f2937" strokeWidth="2" />
		</svg>
	);
}

export default function InvestorPortal(props: { previewInvestorId?: number } = {}) {
	return (
		<PortalCurrencyProvider>
			<InvestorPortalInner {...props} />
		</PortalCurrencyProvider>
	);
}

function InvestorPortalInner({ previewInvestorId }: { previewInvestorId?: number } = {}) {
	const { user, logout } = useAuth();
	const { fmt } = usePortalCurrency();
	const isPreview = !!previewInvestorId;
	const [section, setSection] = useState("dashboard");

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-investor-preview", previewInvestorId] : ["portal-investor-me"],
		queryFn: () =>
			api.get(isPreview ? `/portal/investor/preview/${previewInvestorId}` : "/portal/investor/me").then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const investor = data?.investor;
	const investments: any[] = data?.investments ?? [];
	const distributions: any[] = data?.distributions ?? [];
	const currency = investments[0]?.currency ?? "KGS";

	const shareByProperty = useMemo(() => {
		const m = new Map<number, number>();
		investments.forEach((i) => m.set(i.propertyId, parseFloat(i.sharePercent || 0) / 100));
		return m;
	}, [investments]);
	const payoutOf = (d: any) => parseFloat(d.netProfit ?? d.amount ?? 0) * (shareByProperty.get(d.propertyId) ?? 0);

	const totalInvested = investments.reduce((s, i) => s + parseFloat(i.capitalInvested || 0), 0);
	const totalReceived = distributions.reduce((s, d) => s + payoutOf(d), 0);
	const roi = totalInvested > 0 ? (totalReceived / totalInvested) * 100 : 0;
	const balance = totalInvested - totalReceived;

	const userName = isPreview
		? investor?.fullName || "Инвестор"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || investor?.fullName || "Инвестор";
	const firstName = userName.split(" ")[0];

	const ledger = useMemo(() => {
		const rows = [
			...investments.map((i) => ({
				date: i.investedAt || i.createdAt,
				label: `Вложение · ${i.propertyName || "объект"}`,
				invested: parseFloat(i.capitalInvested || 0),
				received: 0,
			})),
			...distributions.map((d) => ({
				date: d.distributedAt || d.createdAt,
				label: d.period ? `Выплата · ${d.period}` : "Выплата дохода",
				invested: 0,
				received: payoutOf(d),
			})),
		].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
		let run = 0;
		return rows.map((r) => {
			run += r.invested - r.received;
			return { ...r, balance: run };
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [investments, distributions]);

	const valueSeries = useMemo(() => {
		let run = 0;
		return investments
			.slice()
			.sort((a, b) => new Date(a.investedAt || 0).getTime() - new Date(b.investedAt || 0).getTime())
			.map((i) => {
				run += parseFloat(i.capitalInvested || 0);
				return { value: run };
			});
	}, [investments]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-transparent" />
			</div>
		);
	}

	if (!isPreview && !investor) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
				<div className="max-w-md text-center">
					<p className="mb-3 font-serif text-2xl font-bold text-slate-900">SmartEstate</p>
					<h1 className="mb-2 font-serif text-xl font-bold text-slate-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к инвестиционному профилю. Как только менеджер откроет
						доступ, здесь появятся портфель, выплаты и акт сверки.
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
					<PortalPageTitle title={`Добрый день, ${firstName}`} subtitle="Обзор вашего инвестиционного портфеля." />
					<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
						<PortalKpi icon={Wallet} label="Стоимость портфеля" value={fmt(totalInvested, currency)} sub={`${investments.length} объект(а)`} />
						<PortalKpi icon={TrendingUp} label="Рост портфеля" value={`+${roi.toFixed(1)}%`} valueClassName="text-emerald-600" sub={`+${fmt(totalReceived, currency)}`} subClassName="text-emerald-600" />
						<PortalKpi icon={Wallet} label="Получено выплат" value={fmt(totalReceived, currency)} sub={`${distributions.length} транзакций`} />
						<PortalKpi icon={Building2} label="Объектов" value={`${investments.length}`} sub="в портфеле" />
					</div>

					<div className="mt-5">
						<PortalAiTip>
							{roi >= 8
								? "Доходность портфеля выше типичной для класса недвижимости — рассмотрите реинвестирование выплат."
								: "Портфель в активной фазе. Регулярные выплаты помогают планировать денежный поток."}
						</PortalAiTip>
					</div>

					<h2 className="mb-3 mt-8 font-serif text-xl font-bold text-slate-900">Последние операции</h2>
					<div className="space-y-3">
						{distributions.length === 0 && (
							<div className="rounded-2xl border border-gray-200/80 bg-white py-10 text-center text-sm text-gray-400">Операций пока нет</div>
						)}
						{distributions.slice(0, 5).map((d, idx) => (
							<div key={d.id ?? idx} className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
								<div>
									<p className="font-semibold text-slate-900">{d.period ? `Выплата · ${d.period}` : "Выплата дохода"}</p>
									<p className="mt-0.5 text-xs text-gray-400">{fmtDate(d.distributedAt || d.createdAt || "")}</p>
								</div>
								<p className="font-bold text-emerald-600">+{fmt(payoutOf(d), currency)}</p>
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
							<div className="rounded-2xl border border-gray-200/80 bg-white py-12 text-center text-sm text-gray-400">Объектов пока нет</div>
						)}
						{investments.map((inv, idx) => {
							const share = totalInvested > 0 ? (parseFloat(inv.capitalInvested || 0) / totalInvested) * 100 : 0;
							return (
								<div key={inv.id ?? idx} className="grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:grid-cols-[300px_1fr]">
									<div className="flex flex-col items-center justify-center gap-3 bg-[#f3f3f1] p-7 text-center">
										<Building2 className="h-9 w-9 text-slate-400" />
										<div>
											<p className="font-serif text-lg font-bold text-slate-900">{inv.propertyName || "Объект"}</p>
											{inv.propertyUnit && <p className="text-xs text-gray-400">{inv.propertyUnit}</p>}
										</div>
									</div>
									<div className="flex flex-col justify-center gap-3 p-6">
										<div className="flex items-center justify-between border-b border-gray-100 pb-3">
											<span className="font-bold text-slate-900">Доля {inv.sharePercent ?? 0}%</span>
											<div className="text-right">
												<p className="text-xs text-gray-400">Вложено</p>
												<p className="font-bold text-slate-900">{fmt(inv.capitalInvested, inv.currency || currency)}</p>
											</div>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray-500">Вложено: {fmtDate(inv.investedAt || "")}</span>
											<span className="font-semibold text-emerald-600">{share.toFixed(1)}% портфеля</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}

			{section === "finance" && (
				<>
					<PortalPageTitle title="Финансы" subtitle="Вложения, выплаты и акт сверки." />
					<div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
						<div className="grid gap-6 sm:grid-cols-3">
							<div>
								<p className="text-sm text-gray-500">Вложено</p>
								<p className="mt-1 text-2xl font-bold text-slate-900">{fmt(totalInvested, currency)}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Получено</p>
								<p className="mt-1 text-2xl font-bold text-emerald-600">{fmt(totalReceived, currency)}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Сальдо</p>
								<p className="mt-1 text-2xl font-bold text-slate-900">{fmt(balance, currency)}</p>
							</div>
						</div>
						<div className="mt-5">
							<div className="mb-1.5 flex items-center justify-between text-sm">
								<span className="text-gray-500">Возврат вложений</span>
								<span className="font-semibold text-slate-900">{roi.toFixed(1)}%</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
								<div className="h-full rounded-full bg-slate-800" style={{ width: `${Math.min(roi, 100)}%` }} />
							</div>
						</div>
					</div>

					<h2 className="mb-3 mt-8 font-serif text-xl font-bold text-slate-900">Акт сверки</h2>
					<div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-5 py-3 font-medium">Дата</th>
										<th className="px-5 py-3 font-medium">Операция</th>
										<th className="px-5 py-3 text-right font-medium">Вложено</th>
										<th className="px-5 py-3 text-right font-medium">Получено</th>
										<th className="px-5 py-3 text-right font-medium">Баланс</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{ledger.length === 0 && (
										<tr><td colSpan={5} className="py-10 text-center text-gray-400">Операций пока нет</td></tr>
									)}
									{ledger.map((r, idx) => (
										<tr key={idx} className="hover:bg-gray-50/80">
											<td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmtDate(r.date || "")}</td>
											<td className="px-5 py-3 text-slate-800">{r.label}</td>
											<td className="px-5 py-3 text-right text-slate-900">{r.invested ? fmt(r.invested, currency) : "—"}</td>
											<td className="px-5 py-3 text-right text-emerald-600">{r.received ? fmt(r.received, currency) : "—"}</td>
											<td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">{fmt(r.balance, currency)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}

			{section === "documents" && (
				<>
					<PortalPageTitle title="Документы" subtitle="Доступ ко всем вашим официальным документам." />
					<div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
						<FileText className="mx-auto mb-3 h-9 w-9 text-gray-300" />
						<p className="text-sm text-gray-500">Документы появятся здесь по мере оформления.</p>
					</div>
				</>
			)}

			{section === "analytics" && (
				<>
					<PortalPageTitle title="Аналитика портфеля" subtitle="Отслеживайте эффективность инвестиций." />
					<div className="mb-5 rounded-2xl bg-[#f3f3f1] px-5 py-3 text-sm italic text-gray-500">
						Ориентировочная оценка. Данные носят информационный характер и не являются гарантией доходности.
					</div>
					<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
						<PortalKpi icon={Wallet} label="Вложено" value={fmt(totalInvested, currency)} />
						<PortalKpi icon={Wallet} label="Получено" value={fmt(totalReceived, currency)} valueClassName="text-emerald-600" />
						<PortalKpi icon={TrendingUp} label="Доход" value={`+${fmt(totalReceived, currency)}`} valueClassName="text-emerald-600" />
						<PortalKpi icon={TrendingUp} label="Доходность" value={`+${roi.toFixed(1)}%`} valueClassName="text-emerald-600" />
					</div>

					<div className="mt-5 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
						<p className="mb-4 font-semibold text-slate-900">История стоимости</p>
						<AreaChart points={valueSeries} />
					</div>

					<h2 className="mb-3 mt-8 font-serif text-xl font-bold text-slate-900">Разбивка по объектам</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{investments.map((inv, idx) => (
							<div key={inv.id ?? idx} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
								<p className="font-semibold text-slate-900">{inv.propertyName || "Объект"}{inv.propertyUnit ? ` · ${inv.propertyUnit}` : ""}</p>
								<div className="mt-3 flex items-center justify-between text-sm">
									<span className="text-gray-500">Вложено</span>
									<span className="font-bold text-slate-900">{fmt(inv.capitalInvested, inv.currency || currency)}</span>
								</div>
								<div className="mt-1 flex items-center justify-between text-sm">
									<span className="text-gray-500">Доля</span>
									<span className="font-semibold text-emerald-600">{inv.sharePercent ?? 0}%</span>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{section === "services" && (
				<>
					<PortalPageTitle title="Сервисы и предложения" subtitle="Эксклюзивные услуги и новые инвестиционные возможности." />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{["Новые проекты", "Реинвестирование", "Документооборот", "Поддержка", "Аналитический отчёт", "Налоговая справка"].map((s) => (
							<div key={s} className="relative rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
								<span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Скоро</span>
								<LayoutGrid className="h-6 w-6 text-gray-300" />
								<p className="mt-3 font-semibold text-slate-700">{s}</p>
							</div>
						))}
					</div>
				</>
			)}

			{section === "profile" && (
				<>
					<PortalPageTitle title="Мой профиль" subtitle="Ваши персональные данные." />
					<div className="max-w-lg space-y-2 rounded-2xl border border-gray-200/80 bg-white p-6 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
						<div className="flex justify-between gap-3 border-b border-gray-100 pb-3">
							<span className="text-gray-500">Имя</span>
							<span className="font-medium text-slate-900">{investor?.fullName || userName}</span>
						</div>
						<div className="flex justify-between gap-3 border-b border-gray-100 pb-3">
							<span className="text-gray-500">Телефон</span>
							<span className="font-medium text-slate-900">{investor?.phone || "—"}</span>
						</div>
						<div className="flex justify-between gap-3">
							<span className="text-gray-500">E-mail</span>
							<span className="font-medium text-slate-900">{investor?.email || user?.email || "—"}</span>
						</div>
					</div>
				</>
			)}
		</PortalShell>
	);
}
