import { useQuery } from "@tanstack/react-query";
import { CounterpartyPortal, type LedgerInput } from "@/components/portal/counterparty-portal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const fmt = (n: any) => Math.round(parseFloat(n ?? 0)).toLocaleString("ru-KG");

export default function SupplierPortal({ previewSupplierId }: { previewSupplierId?: number } = {}) {
	const { user, logout } = useAuth();
	const isPreview = !!previewSupplierId;

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-supplier-preview", previewSupplierId] : ["portal-supplier-me"],
		queryFn: () =>
			api.get(isPreview ? `/portal/supplier/preview/${previewSupplierId}` : "/portal/supplier/me").then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const supplier = data?.supplier;
	const summary = data?.summary ?? {};
	const deliveries: any[] = data?.deliveries ?? [];
	const payments: any[] = data?.payments ?? [];
	const currency = summary.currency ?? "KGS";

	const supplierName = supplier?.name || supplier?.fullName || "Поставщик";
	const userName = isPreview
		? supplierName
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || supplierName;

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-transparent" />
			</div>
		);
	}

	if (!isPreview && !supplier) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
				<div className="max-w-md text-center">
					<p className="mb-3 font-serif text-2xl font-bold text-slate-900">SmartEstate</p>
					<h1 className="mb-2 font-serif text-xl font-bold text-slate-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к договору поставки. Как только менеджер откроет доступ,
						здесь появятся поставки, оплаты и акт сверки.
					</p>
				</div>
			</div>
		);
	}

	const ledger: LedgerInput[] = [
		...deliveries.map((d) => ({
			date: d.documentDate,
			label: d.itemName ? `Поставка · ${d.itemName}` : "Поставка",
			charged: parseFloat(d.totalAmount || 0),
			paid: 0,
		})),
		...payments.map((p) => ({ date: p.date, label: p.description || "Оплата", charged: 0, paid: parseFloat(p.amount || 0) })),
	];

	return (
		<CounterpartyPortal
			brandSub="Портал поставщика"
			userName={userName}
			isPreview={isPreview}
			onLogout={logout}
			greetingName={supplierName.split(" ")[0]}
			dashSubtitle="Обзор поставок и расчётов."
			currency={currency}
			kpis={[
				{ label: "Поставлено", value: `${fmt(summary.totalSupplied || summary.contractAmount)} ${currency}`, sub: `${deliveries.length} поставок` },
				{ label: "Оплачено", value: `${fmt(summary.paidAmount)} ${currency}`, sub: `${payments.length} платежей`, positive: true },
				{ label: "Остаток", value: `${fmt(summary.outstanding)} ${currency}` },
			]}
			aiTip="Своевременное предоставление накладных и счетов ускоряет оплату поставок."
			contractsTitle="Мой договор поставки"
			contractsSubtitle="Договор и его статус."
			contracts={[
				{
					title: summary.contractNumber ? `Договор №${summary.contractNumber}` : "Договор поставки",
					sub: supplierName,
					amount: `${fmt(summary.contractAmount)} ${currency}`,
					status: summary.isActive === false ? "Завершён" : "Активен",
				},
			]}
			ledger={ledger}
			summaryLabels={{ charged: "Поставлено", paid: "Оплачено", balance: "Остаток" }}
			profile={{
				name: supplierName,
				phone: supplier?.phone,
				email: supplier?.email,
				badges: ["Верифицирован", "Поставщик"],
			}}
		/>
	);
}
