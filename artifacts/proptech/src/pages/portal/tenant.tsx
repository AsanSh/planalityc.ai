import { useQuery } from "@tanstack/react-query";
import { CounterpartyPortal, type LedgerInput } from "@/components/portal/counterparty-portal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const fmt = (n: any) => Math.round(parseFloat(n ?? 0)).toLocaleString("ru-KG");
const fmtDate = (d: string) => {
	if (!d) return "—";
	const t = new Date(d);
	return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const ACCRUAL_LABEL: Record<string, string> = { rent: "Аренда", deposit: "Депозит", utility: "Коммунальные", penalty: "Пени" };
const STATUS: Record<string, string> = { active: "Активен", draft: "Черновик", ended: "Завершён", terminated: "Расторгнут" };

export default function TenantPortal({ previewTenantId }: { previewTenantId?: number } = {}) {
	const { user, logout } = useAuth();
	const isPreview = !!previewTenantId;

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-tenant-preview", previewTenantId] : ["portal-tenant-me"],
		queryFn: () =>
			api.get(isPreview ? `/portal/tenant/preview/${previewTenantId}` : "/portal/tenant/me").then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const tenant = data?.tenant;
	const contracts: any[] = data?.contracts ?? [];
	const accruals: any[] = data?.accruals ?? [];
	const payments: any[] = data?.payments ?? [];
	const currency = accruals[0]?.currency || "KGS";

	const userName = isPreview
		? tenant?.fullName || "Арендатор"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || tenant?.fullName || "Арендатор";

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-transparent" />
			</div>
		);
	}

	if (!isPreview && !tenant) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
				<div className="max-w-md text-center">
					<p className="mb-3 font-serif text-2xl font-bold text-slate-900">SmartEstate</p>
					<h1 className="mb-2 font-serif text-xl font-bold text-slate-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к договору аренды. Как только менеджер откроет доступ,
						здесь появятся договор, начисления и акт сверки.
					</p>
				</div>
			</div>
		);
	}

	const totalCharged = accruals.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
	const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
	const rent = contracts.find((c) => c.status === "active")?.rentAmount ?? contracts[0]?.rentAmount ?? 0;

	const ledger: LedgerInput[] = [
		...accruals.map((a) => ({
			date: a.dueDate,
			label: ACCRUAL_LABEL[a.accrualType] || "Начисление",
			charged: parseFloat(a.amount || 0),
			paid: 0,
		})),
		...payments.map((p) => ({ date: p.paymentDate, label: "Оплата", charged: 0, paid: parseFloat(p.amount || 0) })),
	];

	return (
		<CounterpartyPortal
			brandSub="Портал арендатора"
			userName={userName}
			isPreview={isPreview}
			onLogout={logout}
			greetingName={userName.split(" ")[0]}
			dashSubtitle="Обзор вашей аренды и платежей."
			currency={currency}
			kpis={[
				{ label: "Аренда / мес", value: `${fmt(rent)} ${currency}` },
				{ label: "Начислено", value: `${fmt(totalCharged)} ${currency}`, sub: `${accruals.length} начислений` },
				{ label: "Оплачено", value: `${fmt(totalPaid)} ${currency}`, sub: `${payments.length} платежей`, positive: true },
				{ label: "Остаток", value: `${fmt(totalCharged - totalPaid)} ${currency}` },
			]}
			aiTip="Своевременная оплата аренды формирует положительную историю и доступ к специальным условиям продления."
			contractsTitle="Мои договоры аренды"
			contractsSubtitle="Действующие и завершённые договоры."
			contracts={contracts.map((c) => ({
				title: `${c.propertyName || "Объект"}${c.propertyUnit ? ` · ${c.propertyUnit}` : ""}`,
				sub: `№${c.contractNumber} · ${fmtDate(c.startDate)} — ${fmtDate(c.endDate)}`,
				amount: `${fmt(c.rentAmount)} ${currency}/мес`,
				status: STATUS[c.status] || c.status,
			}))}
			ledger={ledger}
			summaryLabels={{ charged: "Начислено", paid: "Оплачено", balance: "Остаток" }}
			profile={{
				name: tenant?.fullName || userName,
				phone: tenant?.phone,
				email: tenant?.email,
				badges: ["Верифицирован", "Арендатор"],
			}}
		/>
	);
}
