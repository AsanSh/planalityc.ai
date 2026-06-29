import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	Bell,
	Building2,
	CheckCircle,
	CreditCard,
	Download,
	FileText,
	Home,
	LogOut,
	Phone,
	Printer,
	Send,
	Share2,
	Wallet,
	Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClientPortalExperience } from "@/components/client-portal-experience";
import {
	getPortalContentItems,
	isContentVisibleForAudience,
	PORTAL_CONTENT_QUERY_KEY,
} from "@/lib/client-portal";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shareAct } from "@/lib/share-act";

function fmt(n: unknown) {
	const num = parseFloat(String(n ?? 0));
	return num.toLocaleString("ru-KG", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function fmtDate(d: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("ru-KG", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function KPI({
	icon,
	label,
	value,
	sub,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
	color: string;
}) {
	return (
		<div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
			<div
				className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
			>
				{icon}
			</div>
			<div className="min-w-0">
				<p className="text-xs text-gray-500 font-medium">{label}</p>
				<p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5 break-words">{value}</p>
				{sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

const STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	review: "На утверждении",
	signed: "Подписан",
	cancelled: "Расторгнут",
	completed: "Завершён",
};

const SCHEDULE_STATUS: Record<string, { label: string; cls: string; row: string }> = {
	paid: { label: "Оплачено", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", row: "bg-emerald-50/40" },
	partial: { label: "Частично", cls: "bg-amber-100 text-amber-700 border-amber-200", row: "bg-amber-50/30" },
	overdue: { label: "Просрочено", cls: "bg-rose-100 text-rose-700 border-rose-200", row: "bg-rose-50/40" },
	pending: { label: "Ожидается", cls: "bg-gray-100 text-gray-600 border-gray-200", row: "" },
};

// Эффективный статус строки графика: оплачено / частично / просрочено / ожидается
function scheduleStatusOf(a: { status?: string; amount?: unknown; paidAmount?: unknown; dueDate?: string }) {
	const amount = parseFloat(String(a.amount ?? 0));
	const paid = parseFloat(String(a.paidAmount ?? 0));
	if (a.status === "paid" || (amount > 0 && paid >= amount)) return "paid";
	if (paid > 0) return "partial";
	if (a.dueDate && new Date(a.dueDate).getTime() < Date.now()) return "overdue";
	return "pending";
}

export default function BuyerPortal({ previewBuyerId }: { previewBuyerId?: number } = {}) {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const isPreview = !!previewBuyerId;

	const { data, isLoading } = useQuery({
		queryKey: isPreview ? ["portal-buyer-preview", previewBuyerId] : ["portal-buyer-me"],
		queryFn: () => {
			const url = isPreview
				? `/portal/buyer/preview/${previewBuyerId}`
				: "/portal/buyer/me";
			return api.get(url).then((r) => r.data);
		},
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	// Объявления/уведомления портала
	const { data: announcements = [] } = useQuery({
		queryKey: PORTAL_CONTENT_QUERY_KEY,
		queryFn: () => getPortalContentItems(),
	});
	const buyerNews = useMemo(
		() => announcements.filter((i) => isContentVisibleForAudience(i, "buyers")),
		[announcements],
	);

	// Модалки портала
	const [modal, setModal] = useState<
		null | "pay" | "requests" | "documents" | "notifications" | "settings" | "manager" | "chat"
	>(null);

	// Заявки покупателя (пока хранятся локально; серверная доставка — следующий этап)
	const REQ_KEY = "buyerPortalRequests";
	const [myRequests, setMyRequests] = useState<
		Array<{ id: number; subject: string; body: string; createdAt: string }>
	>(() => {
		try {
			return JSON.parse(localStorage.getItem(REQ_KEY) || "[]");
		} catch {
			return [];
		}
	});
	const [reqSubject, setReqSubject] = useState("Сантехника / коммуникации");
	const [reqBody, setReqBody] = useState("");
	const [chatBody, setChatBody] = useState("");

	const submitRequest = () => {
		if (!reqBody.trim()) {
			toast({ title: "Опишите заявку", variant: "destructive" });
			return;
		}
		const next = [
			{ id: Date.now(), subject: reqSubject, body: reqBody.trim(), createdAt: new Date().toISOString() },
			...myRequests,
		];
		setMyRequests(next);
		try {
			localStorage.setItem(REQ_KEY, JSON.stringify(next));
		} catch {
			/* ignore */
		}
		setReqBody("");
		toast({ title: "Заявка зарегистрирована", description: "Менеджер свяжется с вами." });
	};

	const handleQuickAction = (key: string) => {
		if (key === "soon") {
			toast({ title: "Раздел скоро появится" });
			return;
		}
		if (key === "pay" || key === "requests" || key === "documents") setModal(key);
	};

	const handleDownloadContract = async (contractId: number) => {
		try {
			const { data: doc } = await api.get(
				`/portal/buyer/contract-document?contractId=${contractId}`,
			);
			const bytes = Uint8Array.from(atob(doc.dataBase64), (c) => c.charCodeAt(0));
			const blob = new Blob([bytes], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = doc.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast({ title: "Договор не загружен", variant: "destructive" });
		}
	};

	const handleShare = async () => {
		const res = await shareAct({
			title: "Акт сверки",
			subjectLabel: "Покупатель",
			subjectName: buyer?.fullName || userName,
			currency,
			summaryRows: [
				{ label: "По графику", value: `${fmt(summary.totalCharged)} ${currency}` },
				{ label: "Оплачено", value: `${fmt(summary.totalPaid)} ${currency}` },
				{ label: "Остаток", value: `${fmt(outstanding)} ${currency}` },
			],
			lines: lines.map((l: any) => ({
				date: fmtDate(l.date),
				description: `${l.type === "charge" ? "График" : "Оплата"} — ${l.description}`,
				amount: `${fmt(l.charged ?? l.paid)} ${l.currency ?? currency}`,
				balance: `${fmt(l.balanceAfter)} ${currency}`,
			})),
		});
		if (res === "whatsapp") {
			toast({ title: "Открываем WhatsApp с текстом акта" });
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	const buyer = data?.buyer;
	const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
	const accruals = Array.isArray(data?.accruals) ? data.accruals : [];
	const payments = Array.isArray(data?.payments) ? data.payments : [];
	const summary = data?.summary ?? {};
	const reconciliation = data?.reconciliation ?? {};
	const lines = Array.isArray(reconciliation.lines) ? reconciliation.lines : [];
	const currency = summary.currency ?? "KGS";
	const outstanding = parseFloat(String(summary.outstanding ?? 0));

	const userName = isPreview
		? data?.buyer?.fullName || "Покупатель"
		: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Покупатель";

	const renderPortalModals = () => (
		<>
			<Dialog open={modal === "pay"} onOpenChange={(open) => !open && setModal(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Оплата</DialogTitle>
						<DialogDescription>
							Сводка по договору и ближайшим платежам покупателя.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 sm:grid-cols-3">
						<KPI
							icon={<Wallet className="w-5 h-5 text-emerald-600" />}
							label="Оплачено"
							value={`${fmt(summary.totalPaid)} ${currency}`}
							color="bg-emerald-50"
						/>
						<KPI
							icon={<CreditCard className="w-5 h-5 text-amber-600" />}
							label="По графику"
							value={`${fmt(summary.totalCharged)} ${currency}`}
							color="bg-amber-50"
						/>
						<KPI
							icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
							label="Остаток"
							value={`${fmt(outstanding)} ${currency}`}
							color="bg-rose-50"
						/>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={modal === "requests"}
				onOpenChange={(open) => !open && setModal(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Заявка менеджеру</DialogTitle>
						<DialogDescription>
							Покупатель может оставить обращение по объекту или договору.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<Input value={reqSubject} onChange={(e) => setReqSubject(e.target.value)} />
						<Textarea
							value={reqBody}
							onChange={(e) => setReqBody(e.target.value)}
							placeholder="Опишите вопрос..."
						/>
						<Button onClick={submitRequest} className="w-full gap-2">
							<Send className="h-4 w-4" /> Отправить заявку
						</Button>
						{myRequests.length ? (
							<div className="space-y-2">
								{myRequests.slice(0, 3).map((request) => (
									<div key={request.id} className="rounded-xl border p-3 text-sm">
										<div className="font-semibold">{request.subject}</div>
										<div className="text-gray-500">{request.body}</div>
									</div>
								))}
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={modal === "documents"}
				onOpenChange={(open) => !open && setModal(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Документы</DialogTitle>
						<DialogDescription>
							Договоры, акты и файлы, доступные покупателю.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						{contracts.map((contract: any) => (
							<div
								key={contract.id}
								className="flex items-center justify-between rounded-xl border p-3 text-sm"
							>
								<span>№{contract.contractNumber}</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => void handleDownloadContract(contract.id)}
								>
									Скачать
								</Button>
							</div>
						))}
						{!contracts.length ? (
							<div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
								Документов пока нет
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={modal === "notifications"}
				onOpenChange={(open) => !open && setModal(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Уведомления</DialogTitle>
						<DialogDescription>Новости и объявления от компании.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						{buyerNews.slice(0, 5).map((item: any) => (
							<div key={item.id} className="rounded-xl border p-3 text-sm">
								<div className="font-semibold">{item.title}</div>
								<div className="line-clamp-2 text-gray-500">{item.body}</div>
							</div>
						))}
						{!buyerNews.length ? (
							<div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
								Уведомлений пока нет
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={modal === "manager" || modal === "chat" || modal === "settings"}
				onOpenChange={(open) => !open && setModal(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{modal === "manager"
								? "Менеджер объекта"
								: modal === "chat"
									? "Чат с менеджером"
									: "Настройки портала"}
						</DialogTitle>
						<DialogDescription>
							{modal === "chat"
								? "Отправьте сообщение менеджеру."
								: "Раздел портала покупателя."}
						</DialogDescription>
					</DialogHeader>
					{modal === "chat" ? (
						<div className="space-y-3">
							{buyerNews.length > 0 && (
								<div className="max-h-48 space-y-2 overflow-y-auto">
									{buyerNews.slice(0, 5).map((item: any) => (
										<div key={item.id} className="rounded-2xl bg-gray-50 p-3 text-sm">
											<div className="font-semibold text-gray-900">{item.title}</div>
											{item.body && <div className="mt-0.5 text-xs text-gray-600">{item.body}</div>}
										</div>
									))}
								</div>
							)}
							<Textarea
								value={chatBody}
								onChange={(e) => setChatBody(e.target.value)}
								placeholder="Сообщение менеджеру..."
							/>
							<Button
								className="w-full gap-2"
								onClick={() => {
									if (!chatBody.trim()) return;
									setChatBody("");
									toast({ title: "Сообщение отправлено менеджеру" });
								}}
							>
								<Send className="h-4 w-4" /> Отправить
							</Button>
						</div>
					) : modal === "manager" ? (
						<div className="space-y-3 text-center">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
								<Phone className="h-7 w-7 text-emerald-600" />
							</div>
							<p className="font-semibold text-gray-900">Менеджер объекта</p>
							<p className="text-sm text-gray-500">
								По вопросам оплаты, документов и приёмки оставьте заявку — менеджер
								свяжется с вами.
							</p>
							<Button className="w-full gap-2" onClick={() => setModal("requests")}>
								<Wrench className="h-4 w-4" /> Оставить заявку
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<div className="space-y-2 rounded-xl border p-3 text-sm">
								<div className="flex justify-between gap-3">
									<span className="text-gray-500">Имя</span>
									<span className="font-medium text-gray-900">
										{[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
											buyer?.fullName ||
											"—"}
									</span>
								</div>
								<div className="flex justify-between gap-3">
									<span className="text-gray-500">Телефон</span>
									<span className="font-medium text-gray-900">
										{buyer?.phone || "—"}
									</span>
								</div>
								<div className="flex justify-between gap-3">
									<span className="text-gray-500">E-mail</span>
									<span className="font-medium text-gray-900">{user?.email || "—"}</span>
								</div>
							</div>
							<Button
								variant="outline"
								className="w-full gap-2 text-rose-600 hover:text-rose-700"
								onClick={logout}
							>
								<LogOut className="h-4 w-4" /> Выйти из кабинета
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);

	// Аккаунт покупателя ещё не привязан к договору (linkedBuyerId не задан)
	if (!isPreview && !buyer) {
		return (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
					<div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
								<Home className="w-5 h-5 text-white" />
							</div>
							<div>
								<p className="text-sm font-bold text-gray-900">Planalityc.ai</p>
								<p className="text-[10px] text-gray-600 -mt-0.5">Портал покупателя</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 gap-1.5">
							<LogOut className="w-4 h-4" /> Выйти
						</Button>
					</div>
				</header>
				<div className="max-w-lg mx-auto px-4 py-16 text-center">
					<div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-5">
						<Home className="w-7 h-7 text-sky-600" />
					</div>
					<h1 className="text-xl font-bold text-gray-900 mb-2">Здравствуйте, {userName}</h1>
					<p className="text-gray-600 leading-relaxed">
						Ваш аккаунт ещё не привязан к договору купли-продажи. Как только менеджер
						отдела продаж откроет доступ, здесь появятся ваш договор, график платежей,
						начисления и акт сверки.
					</p>
					<p className="text-sm text-gray-400 mt-4">
						Обратитесь к вашему менеджеру, чтобы получить доступ к личному кабинету.
					</p>
				</div>
			</div>
		);
	}


	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center">
							<Home className="w-5 h-5 text-white" />
						</div>
						<div>
							<p className="text-sm font-bold text-gray-900">Planalityc.ai</p>
							<p className="text-[10px] text-gray-600 -mt-0.5">Портал покупателя</p>
						</div>
					</div>
					<div className="flex items-center gap-2 sm:gap-3">
						{isPreview && (
							<span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
								👁 Предпросмотр
							</span>
						)}
						<span className="hidden sm:inline text-sm text-gray-600 font-medium max-w-[40vw] truncate">{userName}</span>
						{!isPreview && (
							<Button
								variant="ghost"
								size="sm"
								onClick={logout}
								className="text-gray-500 gap-1.5"
							>
								<LogOut className="w-4 h-4" /> Выйти
							</Button>
						)}
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
				<div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white">
					<p className="text-sm opacity-80 mb-1">Добро пожаловать,</p>
					<h1 className="text-2xl font-bold">{buyer?.fullName || userName}</h1>
					<p className="text-sm opacity-70 mt-1">Личный кабинет покупателя</p>
				</div>

				<ClientPortalExperience
					audience="buyers"
					userName={buyer?.fullName || userName}
					projectName={contracts[0]?.projectName || "Ваш ЖК"}
					unitLabel={contracts[0]?.unitNumber ? `Квартира №${contracts[0].unitNumber}` : "Мой объект"}
					managerName="Менеджер объекта"
					unitBadge={contracts[0]?.unitNumber ? `№ ${contracts[0].unitNumber}` : undefined}
					notificationCount={buyerNews.length}
					onAction={handleQuickAction}
					onOpenNotifications={() => setModal("notifications")}
					onOpenSettings={() => setModal("settings")}
					onCallManager={() => setModal("manager")}
					onOpenChat={() => setModal("chat")}
				/>

				{renderPortalModals()}

				<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
					<KPI
						icon={<Building2 className="w-6 h-6 text-blue-600" />}
						label="Договоров"
						value={`${contracts.length}`}
						sub={`активных: ${summary.activeContracts ?? 0}`}
						color="bg-blue-50"
					/>
					<KPI
						icon={<Wallet className="w-6 h-6 text-emerald-600" />}
						label="Оплачено"
						value={`${fmt(summary.totalPaid)} ${currency}`}
						sub={`${payments.length} платежей`}
						color="bg-emerald-50"
					/>
					<KPI
						icon={<CreditCard className="w-6 h-6 text-amber-600" />}
						label="По графику"
						value={`${fmt(summary.totalCharged)} ${currency}`}
						sub={`${accruals.length} начислений`}
						color="bg-amber-50"
					/>
					<KPI
						icon={
							outstanding > 0 ? (
								<AlertCircle className="w-6 h-6 text-rose-600" />
							) : (
								<CheckCircle className="w-6 h-6 text-emerald-600" />
							)
						}
						label="Задолженность"
						value={`${fmt(Math.abs(outstanding))} ${currency}`}
						sub={outstanding > 0 ? "к оплате" : "нет долга"}
						color={outstanding > 0 ? "bg-rose-50" : "bg-emerald-50"}
					/>
				</div>

				<div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b bg-gray-50">
						<FileText className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">Мои договоры</h2>
					</div>
					{contracts.length === 0 ? (
						<div className="py-12 text-center text-gray-600">
							<FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
							<p className="text-sm">Нет договоров</p>
						</div>
					) : (
						<div className="divide-y">
							{contracts.map((c: any) => (
								<div key={c.id} className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
									<div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
										<Home className="w-5 h-5 text-sky-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-gray-900 truncate">
											{c.projectName || "Объект"}
											{c.unitNumber ? ` · ${c.unitNumber}` : ""}
										</p>
										<p className="text-xs text-gray-500">
											№{c.contractNumber} · {fmtDate(c.contractDate || "")}
										</p>
										<p className="text-sm font-medium text-gray-800 mt-0.5">
											{fmt(c.totalAmount)} {c.currency || currency}
										</p>
									</div>
									<div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
										<Badge variant="secondary" className="text-xs">
											{STATUS_LABELS[c.status] || c.status}
										</Badge>
										{c.contractDocument && (
											<Button
												variant="outline"
												size="sm"
												className="gap-1 text-xs"
												onClick={() => void handleDownloadContract(c.id)}
											>
												<Download className="w-3.5 h-3.5" /> Договор
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b bg-gray-50">
						<CreditCard className="w-4 h-4 text-gray-500" />
						<h2 className="font-semibold text-gray-900">График платежей</h2>
					</div>
					{accruals.length === 0 ? (
						<div className="py-10 text-center text-gray-600 text-sm">
							График ещё не сформирован
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-3 sm:px-6 py-3 font-medium">№</th>
										<th className="px-3 sm:px-6 py-3 font-medium">Срок</th>
										<th className="px-3 sm:px-6 py-3 font-medium text-right">Сумма</th>
										<th className="px-3 sm:px-6 py-3 font-medium text-right">Оплачено</th>
										<th className="px-3 sm:px-6 py-3 font-medium">Статус</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{accruals.map((a: any) => {
										const st = scheduleStatusOf(a);
										const meta = SCHEDULE_STATUS[st];
										const paidNum = parseFloat(String(a.paidAmount ?? 0));
										return (
											<tr key={a.id} className={`transition-colors hover:bg-gray-50/80 ${meta.row}`}>
												<td className="px-3 sm:px-6 py-3 text-gray-500">{a.installmentNumber}</td>
												<td className="px-3 sm:px-6 py-3 text-gray-600 whitespace-nowrap">{fmtDate(a.dueDate)}</td>
												<td className="px-3 sm:px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
													{fmt(a.amount)} {a.currency || currency}
												</td>
												<td
													className={`px-3 sm:px-6 py-3 text-right whitespace-nowrap ${
														paidNum > 0 ? "font-semibold text-emerald-600" : "text-gray-300"
													}`}
												>
													{fmt(a.paidAmount)} {a.currency || currency}
												</td>
												<td className="px-3 sm:px-6 py-3">
													<span
														className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
													>
														{st === "paid" && <CheckCircle className="h-3 w-3" />}
														{st === "overdue" && <AlertCircle className="h-3 w-3" />}
														{meta.label}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden print:shadow-none">
					<div className="flex items-center justify-between gap-2 flex-wrap px-4 sm:px-6 py-4 border-b bg-gray-50">
						<div className="flex items-center gap-3">
							<CreditCard className="w-4 h-4 text-gray-500" />
							<h2 className="font-semibold text-gray-900">Акт сверки</h2>
						</div>
						<div className="flex items-center gap-2 print:hidden">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleShare()}
								className="gap-1.5 text-xs bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/20"
							>
								<Share2 className="w-3.5 h-3.5" /> Поделиться
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => window.print()}
								className="gap-1.5 text-xs"
							>
								<Printer className="w-3.5 h-3.5" /> Распечатать
							</Button>
						</div>
					</div>
					<div className="grid gap-4 border-b bg-gray-50/50 px-4 py-4 text-sm sm:px-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
						<div>
							<p className="text-gray-500 text-xs">По графику</p>
							<p className="font-semibold">{fmt(summary.totalCharged)} {currency}</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Оплачено</p>
							<p className="font-semibold text-emerald-700">
								{fmt(summary.totalPaid)} {currency}
							</p>
						</div>
						<div>
							<p className="text-gray-500 text-xs">Остаток</p>
							<p
								className={`font-semibold ${outstanding > 0 ? "text-amber-700" : "text-emerald-700"}`}
							>
								{fmt(outstanding)} {currency}
							</p>
						</div>
					</div>
					{lines.length === 0 ? (
						<div className="py-12 text-center text-gray-600">
							<p className="text-sm">Нет операций</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
										<th className="px-3 sm:px-6 py-3 font-medium">Дата</th>
										<th className="px-3 sm:px-6 py-3 font-medium">Тип</th>
										<th className="px-3 sm:px-6 py-3 font-medium">Описание</th>
										<th className="px-3 sm:px-6 py-3 font-medium text-right">Сумма</th>
										<th className="px-3 sm:px-6 py-3 font-medium text-right">Баланс</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{lines.map((line: any, i: number) => (
										<tr key={i} className="hover:bg-gray-50">
											<td className="px-3 sm:px-6 py-3 text-gray-600 whitespace-nowrap">
												{fmtDate(line.date)}
											</td>
											<td className="px-3 sm:px-6 py-3 text-gray-600">
												{line.type === "charge" ? "График" : "Оплата"}
											</td>
											<td className="px-3 sm:px-6 py-3 text-gray-800">{line.description}</td>
											<td className="px-3 sm:px-6 py-3 text-right font-medium whitespace-nowrap">
												{fmt(line.charged ?? line.paid)} {line.currency ?? currency}
											</td>
											<td className="px-3 sm:px-6 py-3 text-right text-gray-600 whitespace-nowrap">
												{fmt(line.balanceAfter)} {currency}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
