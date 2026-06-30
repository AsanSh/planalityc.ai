import { useQuery } from "@tanstack/react-query";
import { CounterpartyPortal, type LedgerInput } from "@/components/portal/counterparty-portal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const fmtDate = (d: string) => {
	if (!d) return "—";
	const t = new Date(d);
	return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("ru-KG", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const STATUS: Record<string, string> = { draft: "Черновик", review: "На утверждении", signed: "Подписан", cancelled: "Расторгнут", completed: "Завершён" };

export default function BuyerPortal({ previewBuyerId }: { previewBuyerId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const isPreview = !!previewBuyerId;

	const { data, isLoading } = useQuery<any>({
		queryKey: isPreview ? ["portal-buyer-preview", previewBuyerId] : ["portal-buyer-me"],
		queryFn: () =>
			api.get(isPreview ? `/portal/buyer/preview/${previewBuyerId}` : "/portal/buyer/me").then((r) => r.data),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	const buyer = data?.buyer;
	const contracts: any[] = data?.contracts ?? [];
	const accruals: any[] = data?.accruals ?? [];
	const payments: any[] = data?.payments ?? [];
	const summary = data?.summary ?? {};
	const currency = summary.currency ?? "KGS";

	const userName = isPreview
		? buyer?.fullName || "Покупатель"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || buyer?.fullName || "Покупатель";

	const handleDownload = async (contractId: number) => {
		try {
			const { data: doc } = await api.get(`/portal/buyer/contract-document?contractId=${contractId}`);
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

	if (!isPreview && !buyer) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
				<div className="max-w-md text-center">
					<p className="mb-3 font-serif text-2xl font-bold text-slate-900">SmartEstate</p>
					<h1 className="mb-2 font-serif text-xl font-bold text-slate-900">Здравствуйте, {userName}</h1>
					<p className="leading-relaxed text-gray-600">
						Ваш аккаунт ещё не привязан к договору купли-продажи. Как только менеджер откроет
						доступ, здесь появятся договор, график платежей и акт сверки.
					</p>
				</div>
			</div>
		);
	}

	const ledger: LedgerInput[] = [
		...accruals.map((a) => ({
			date: a.dueDate,
			label: `Платёж №${a.installmentNumber ?? ""}`.trim(),
			charged: parseFloat(a.amount || 0),
			paid: 0,
		})),
		...payments.map((p) => ({
			date: p.date,
			label: p.description || "Оплата",
			charged: 0,
			paid: parseFloat(p.amount || 0),
		})),
	];

	const documents = contracts
		.filter((c) => c.contractDocument)
		.map((c) => ({
			label: `Договор №${c.contractNumber}`,
			sub: fmtDate(c.contractDate || ""),
			onDownload: () => void handleDownload(c.id),
		}));

	// Прирост стоимости актива (ориентировочно, ~9% годовых от даты договора)
	const boughtFor = parseFloat(summary.contractAmount || 0);
	const firstDate = contracts[0]?.contractDate;
	const yearsHeld = firstDate ? Math.max((Date.now() - new Date(firstDate).getTime()) / (365 * 24 * 3600 * 1000), 0) : 1;
	const appreciation = Math.min(0.09 * yearsHeld, 0.6);
	const currentValue = Math.round(boughtFor * (1 + appreciation));

	return (
		<CounterpartyPortal
			brandSub="Портал покупателя"
			userName={userName}
			isPreview={isPreview}
			onLogout={logout}
			greetingName={userName.split(" ")[0]}
			dashSubtitle="Обзор вашего договора и платежей."
			currency={currency}
			kpis={[
				{ label: "Сумма договора", amount: parseFloat(summary.contractAmount || 0), native: currency },
				{ label: "Оплачено", amount: parseFloat(summary.totalPaid || 0), native: currency, sub: `${payments.length} платежей`, positive: true },
				{ label: "По графику", amount: parseFloat(summary.totalCharged || 0), native: currency, sub: `${accruals.length} начислений` },
				{ label: "Задолженность", amount: parseFloat(summary.outstanding || 0), native: currency },
			]}
			growth={{ boughtFor, currentValue, native: currency }}
			aiTip="Следующий платёж по договору приближается. Планируйте заранее — это поможет избежать просрочек. Стоимость вашего объекта растёт вместе с готовностью дома."
			contractsTitle="Мои договоры"
			contractsSubtitle="Договоры купли-продажи и приобретённые объекты."
			contracts={contracts.map((c) => ({
				title: `${c.projectName || "Объект"}${c.unitNumber ? ` · ${c.unitNumber}` : ""}`,
				sub: `№${c.contractNumber} · ${fmtDate(c.contractDate || "")}`,
				amount: parseFloat(c.totalAmount || 0),
				amountNative: currency,
				status: STATUS[c.status] || c.status,
			}))}
			ledger={ledger}
			summaryLabels={{ charged: "По графику", paid: "Оплачено", balance: "Остаток" }}
			documents={documents}
			profile={{
				name: buyer?.fullName || userName,
				phone: buyer?.phone,
				email: user?.email,
				badges: ["Верифицирован", "Покупатель"],
			}}
		/>
	);
}
