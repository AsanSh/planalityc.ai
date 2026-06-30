import { useQuery } from "@tanstack/react-query";
import { CounterpartyPortal, type LedgerInput } from "@/components/portal/counterparty-portal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function ContractorPortal({ previewContractorId }: { previewContractorId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const isPreview = !!previewContractorId;

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-contractor-preview", previewContractorId] : ["portal-contractor-me"],
		queryFn: () =>
			api.get(isPreview ? `/portal/contractor/preview/${previewContractorId}` : "/portal/contractor/me").then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const contractor = data?.contractor;
	const summary = data?.summary ?? {};
	const lines: any[] = data?.reconciliation?.lines ?? [];
	const currency = summary.currency ?? "KGS";

	const userName = isPreview
		? contractor?.fullName || "Подрядчик"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || contractor?.fullName || "Подрядчик";

	const handleDownload = async () => {
		try {
			const { data: doc } = await api.get(`/portal/contractor/contract-document`);
			const bytes = Uint8Array.from(atob(doc.dataBase64), (c) => c.charCodeAt(0));
			const url = URL.createObjectURL(new Blob([bytes], { type: doc.mimeType }));
			const a = document.createElement("a");
			a.href = url;
			a.download = doc.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast({ title: "Договор не загружен", variant: "destructive" });
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-transparent" />
			</div>
		);
	}

	if (!isPreview && !contractor) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
				<div className="max-w-md text-center">
					<p className="mb-3 font-serif text-2xl font-bold text-slate-900">SmartEstate</p>
					<h1 className="mb-2 font-serif text-xl font-bold text-slate-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к договору подряда. Как только менеджер откроет доступ,
						здесь появятся договор, оплаты и акт сверки.
					</p>
				</div>
			</div>
		);
	}

	const ledger: LedgerInput[] = [
		{ date: "", label: "Сумма договора подряда", charged: parseFloat(summary.contractAmount || 0), paid: 0 },
		...lines.map((l) => ({ date: l.date, label: l.description || "Оплата", charged: 0, paid: parseFloat(l.amount || 0) })),
	];

	const documents = contractor?.contractDocument
		? [{ label: "Договор подряда", sub: summary.contractNumber ? `№${summary.contractNumber}` : undefined, onDownload: () => void handleDownload() }]
		: [];

	return (
		<CounterpartyPortal
			brandSub="Портал подрядчика"
			userName={userName}
			isPreview={isPreview}
			onLogout={logout}
			greetingName={userName.split(" ")[0]}
			dashSubtitle="Обзор договора подряда и расчётов."
			currency={currency}
			kpis={[
				{ label: "Сумма договора", amount: parseFloat(summary.contractAmount || 0), native: currency },
				{ label: "Оплачено", amount: parseFloat(summary.paidAmount || 0), native: currency, positive: true },
				{ label: "Остаток по договору", amount: parseFloat(summary.outstanding || 0), native: currency },
			]}
			stats={[
				{ label: "Статус договора", value: parseFloat(summary.outstanding || 0) <= 0 ? "Закрыт" : "Открыт" },
				{ label: "Оплачено", value: `${summary.contractAmount ? Math.round((parseFloat(summary.paidAmount || 0) / parseFloat(summary.contractAmount)) * 100) : 0}%` },
				{ label: "Платежей проведено", value: String(lines.length) },
			]}
			aiTip="Закрывающие документы и акты выполненных работ ускоряют оплату по договору подряда."
			contractsTitle="Мой договор"
			contractsSubtitle="Договор подряда и его статус."
			contracts={[
				{
					title: summary.contractNumber ? `Договор №${summary.contractNumber}` : "Договор подряда",
					sub: contractor?.fullName,
					amount: parseFloat(summary.contractAmount || 0),
					amountNative: currency,
					status: parseFloat(summary.outstanding || 0) <= 0 ? "Закрыт" : "Открыт",
				},
			]}
			ledger={ledger}
			summaryLabels={{ charged: "Начислено", paid: "Оплачено", balance: "Остаток" }}
			documents={documents}
			profile={{
				name: contractor?.fullName || userName,
				phone: contractor?.phone,
				email: contractor?.email,
				badges: ["Верифицирован", "Подрядчик"],
			}}
		/>
	);
}
