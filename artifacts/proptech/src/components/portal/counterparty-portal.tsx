import { type ReactNode, useMemo, useState } from "react";
import {
	Building2,
	Download,
	FileText,
	LayoutDashboard,
	LayoutGrid,
	Mail,
	Phone,
	UserRound,
	Wallet,
} from "lucide-react";
import {
	PortalAiTip,
	PortalKpi,
	PortalPageTitle,
	PortalProfile,
	PortalServices,
	PortalShell,
	type PortalNavItem,
} from "@/components/portal/portal-shell";
import { PortalCurrencyProvider, usePortalCurrency } from "@/lib/portal-currency";

export type LedgerInput = { date: string; label: string; charged: number; paid: number; currency?: string };
export type PortalKpiInput = { label: string; amount?: number; native?: string; text?: string; sub?: string; positive?: boolean };
export type PortalContractInput = {
	title: string;
	sub?: string;
	amount?: number;
	amountNative?: string;
	status?: string;
	icon?: ReactNode;
};
export type PortalDocInput = { label: string; sub?: string; onDownload?: () => void };
export type PortalGrowth = { boughtFor: number; currentValue: number; native: string };
export type PortalStat = { label: string; value: string };

function fmtDate(d: string) {
	if (!d) return "—";
	const t = new Date(d);
	return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const NAV: PortalNavItem[] = [
	{ id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
	{ id: "contracts", label: "Договоры", icon: Building2 },
	{ id: "finance", label: "Финансы", icon: Wallet },
	{ id: "documents", label: "Документы", icon: FileText },
	{ id: "services", label: "Сервисы", icon: LayoutGrid },
	{ id: "profile", label: "Профиль", icon: UserRound },
];

/**
 * Единый портал «финансового контрагента» (арендатор / подрядчик / поставщик /
 * покупатель) в стиле SmartEstate. Суммы — сырые числа, форматируются по
 * выбранной валюте. Данные нормализуются вызывающей страницей.
 */
export function CounterpartyPortal(props: Parameters<typeof CounterpartyPortalInner>[0]) {
	return (
		<PortalCurrencyProvider>
			<CounterpartyPortalInner {...props} />
		</PortalCurrencyProvider>
	);
}

function CounterpartyPortalInner({
	brandSub,
	userName,
	isPreview,
	onLogout,
	greetingName,
	dashSubtitle,
	currency,
	kpis,
	aiTip,
	growth,
	stats,
	contractsTitle = "Мои договоры",
	contractsSubtitle,
	contracts,
	ledger,
	summaryLabels = { charged: "Начислено", paid: "Оплачено", balance: "Остаток" },
	documents = [],
	profile,
}: {
	brandSub: string;
	userName: string;
	isPreview?: boolean;
	onLogout?: () => void;
	greetingName: string;
	dashSubtitle: string;
	currency: string;
	kpis: PortalKpiInput[];
	aiTip: ReactNode;
	growth?: PortalGrowth;
	stats?: PortalStat[];
	contractsTitle?: string;
	contractsSubtitle?: string;
	contracts: PortalContractInput[];
	ledger: LedgerInput[];
	summaryLabels?: { charged: string; paid: string; balance: string };
	documents?: PortalDocInput[];
	profile: { name: string; phone?: string; email?: string; badges?: string[] };
}) {
	const [section, setSection] = useState("dashboard");
	const { fmt } = usePortalCurrency();

	const totalCharged = ledger.reduce((s, r) => s + r.charged, 0);
	const totalPaid = ledger.reduce((s, r) => s + r.paid, 0);
	const balance = totalCharged - totalPaid;
	const progress = totalCharged > 0 ? Math.min((totalPaid / totalCharged) * 100, 100) : 0;
	const growthPct = growth && growth.boughtFor > 0 ? ((growth.currentValue - growth.boughtFor) / growth.boughtFor) * 100 : 0;

	const sortedLedger = useMemo(() => {
		const rows = ledger.slice().sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
		let run = 0;
		return rows.map((r) => {
			run += r.charged - r.paid;
			return { ...r, balanceRun: run };
		});
	}, [ledger]);

	const recentPayments = useMemo(
		() =>
			ledger
				.filter((r) => r.paid > 0)
				.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
				.slice(0, 5),
		[ledger],
	);

	return (
		<PortalShell
			brandSub={brandSub}
			userName={userName}
			isPreview={isPreview}
			onLogout={onLogout}
			nav={NAV}
			active={section}
			onNavigate={setSection}
		>
			{section === "dashboard" && (
				<>
					<PortalPageTitle title={`Добрый день, ${greetingName}`} subtitle={dashSubtitle} />
					<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
						{kpis.map((k) => (
							<PortalKpi
								key={k.label}
								icon={Wallet}
								label={k.label}
								value={k.text ?? fmt(k.amount ?? 0, k.native ?? currency)}
								sub={k.sub}
								valueClassName={k.positive ? "text-emerald-600" : "text-slate-900"}
								subClassName={k.positive ? "text-emerald-600" : "text-gray-400"}
							/>
						))}
					</div>

					{growth && (
						<div className="mt-5 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
							<p className="font-serif text-lg font-bold text-slate-900">Стоимость вашего актива</p>
							<div className="mt-4 grid gap-6 sm:grid-cols-3">
								<div>
									<p className="text-sm text-gray-500">Приобретено за</p>
									<p className="mt-1 text-xl font-bold text-slate-900">{fmt(growth.boughtFor, growth.native)}</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Текущая оценка</p>
									<p className="mt-1 text-xl font-bold text-emerald-600">{fmt(growth.currentValue, growth.native)}</p>
								</div>
								<div>
									<p className="text-sm text-gray-500">Прирост</p>
									<p className="mt-1 text-xl font-bold text-emerald-600">+{growthPct.toFixed(1)}%</p>
								</div>
							</div>
							<p className="mt-3 text-xs text-gray-400">Оценка ориентировочная и носит информационный характер.</p>
						</div>
					)}

					{stats && stats.length > 0 && (
						<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{stats.map((s) => (
								<div key={s.label} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
									<p className="text-sm text-gray-500">{s.label}</p>
									<p className="mt-1.5 text-xl font-bold text-slate-900">{s.value}</p>
								</div>
							))}
						</div>
					)}

					<div className="mt-5">
						<PortalAiTip>{aiTip}</PortalAiTip>
					</div>

					<h2 className="mb-3 mt-8 font-serif text-xl font-bold text-slate-900">Последние операции</h2>
					<div className="space-y-3">
						{recentPayments.length === 0 && (
							<div className="rounded-2xl border border-gray-200/80 bg-white py-10 text-center text-sm text-gray-400">
								Операций пока нет
							</div>
						)}
						{recentPayments.map((r, idx) => (
							<div key={idx} className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
								<div>
									<p className="font-semibold text-slate-900">{r.label}</p>
									<p className="mt-0.5 text-xs text-gray-400">{fmtDate(r.date)}</p>
								</div>
								<p className="font-bold text-emerald-600">+{fmt(r.paid, r.currency ?? currency)}</p>
							</div>
						))}
					</div>
				</>
			)}

			{section === "contracts" && (
				<>
					<PortalPageTitle title={contractsTitle} subtitle={contractsSubtitle} />
					<div className="space-y-4">
						{contracts.length === 0 && (
							<div className="rounded-2xl border border-gray-200/80 bg-white py-12 text-center text-sm text-gray-400">
								Договоров пока нет
							</div>
						)}
						{contracts.map((c, idx) => (
							<div key={idx} className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
									{c.icon ?? <Building2 className="h-6 w-6 text-slate-400" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-bold text-slate-900">{c.title}</p>
									{c.sub && <p className="text-xs text-gray-400">{c.sub}</p>}
								</div>
								{c.amount != null && (
									<div className="text-right">
										<p className="text-xs text-gray-400">Сумма</p>
										<p className="font-bold text-slate-900">{fmt(c.amount, c.amountNative ?? currency)}</p>
									</div>
								)}
								{c.status && (
									<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{c.status}</span>
								)}
							</div>
						))}
					</div>
				</>
			)}

			{section === "finance" && (
				<>
					<PortalPageTitle title="Финансы" subtitle="Начисления, оплаты и акт сверки." />
					<div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
						<div className="grid gap-6 sm:grid-cols-3">
							<div>
								<p className="text-sm text-gray-500">{summaryLabels.charged}</p>
								<p className="mt-1 text-2xl font-bold text-slate-900">{fmt(totalCharged, currency)}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">{summaryLabels.paid}</p>
								<p className="mt-1 text-2xl font-bold text-emerald-600">{fmt(totalPaid, currency)}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">{summaryLabels.balance}</p>
								<p className="mt-1 text-2xl font-bold text-slate-900">{fmt(balance, currency)}</p>
							</div>
						</div>
						<div className="mt-5">
							<div className="mb-1.5 flex items-center justify-between text-sm">
								<span className="text-gray-500">Прогресс оплаты</span>
								<span className="font-semibold text-slate-900">{progress.toFixed(1)}%</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
								<div className="h-full rounded-full bg-slate-800" style={{ width: `${progress}%` }} />
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
										<th className="px-5 py-3 text-right font-medium">{summaryLabels.charged}</th>
										<th className="px-5 py-3 text-right font-medium">{summaryLabels.paid}</th>
										<th className="px-5 py-3 text-right font-medium">Баланс</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{sortedLedger.length === 0 && (
										<tr><td colSpan={5} className="py-10 text-center text-gray-400">Операций пока нет</td></tr>
									)}
									{sortedLedger.map((r, idx) => (
										<tr key={idx} className="hover:bg-gray-50/80">
											<td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmtDate(r.date)}</td>
											<td className="px-5 py-3 text-slate-800">{r.label}</td>
											<td className="px-5 py-3 text-right text-slate-900">{r.charged ? fmt(r.charged, r.currency ?? currency) : "—"}</td>
											<td className="px-5 py-3 text-right text-emerald-600">{r.paid ? fmt(r.paid, r.currency ?? currency) : "—"}</td>
											<td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">{fmt(r.balanceRun, currency)}</td>
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
					{documents.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
							<FileText className="mx-auto mb-3 h-9 w-9 text-gray-300" />
							<p className="text-sm text-gray-500">Документы появятся здесь по мере оформления.</p>
						</div>
					) : (
						<div className="space-y-3">
							{documents.map((d, idx) => (
								<div key={idx} className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
									<div className="flex min-w-0 items-center gap-3">
										<FileText className="h-5 w-5 shrink-0 text-slate-400" />
										<div className="min-w-0">
											<p className="truncate font-semibold text-slate-900">{d.label}</p>
											{d.sub && <p className="text-xs text-gray-400">{d.sub}</p>}
										</div>
									</div>
									{d.onDownload && (
										<button
											type="button"
											onClick={d.onDownload}
											className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50"
										>
											<Download className="h-3.5 w-3.5" /> Скачать
										</button>
									)}
								</div>
							))}
						</div>
					)}
				</>
			)}

			{section === "services" && (
				<>
					<PortalPageTitle title="Сервисы и предложения" subtitle="Эксклюзивные услуги и партнёрские предложения." />
					<PortalServices />
				</>
			)}

			{section === "profile" && (
				<>
					<PortalPageTitle title="Мой профиль" subtitle="Ваши персональные данные." />
					<PortalProfile
						name={profile.name}
						badges={profile.badges ?? ["Верифицирован"]}
						rows={[
							{ icon: Phone, label: "Номер телефона", value: profile.phone || "—" },
							{ icon: Mail, label: "Email", value: profile.email || "—" },
						]}
					/>
				</>
			)}
		</PortalShell>
	);
}
