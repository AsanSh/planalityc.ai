import {
	AlertTriangle,
	Archive,
	CheckCircle2,
	Clock3,
	Copy,
	FileCheck2,
	FileText,
	Gavel,
	Plus,
	Scale,
	Search,
	Send,
	ShieldCheck,
	Stamp,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type LegalMode = "queue" | "registry" | "templates" | "claims" | "court";
type ContractStatus = "review" | "approved" | "rejected" | "signed";
type ClaimStatus = "draft" | "sent" | "answered" | "court";
type CourtStatus = "preparing" | "filed" | "hearing" | "won";

interface ContractRecord {
	id: number;
	number: string;
	title: string;
	counterparty: string;
	type: string;
	project: string;
	amount: string;
	owner: string;
	status: ContractStatus;
	createdAt: string;
	dueAt: string;
	risk: "low" | "medium" | "high";
}

const CONTRACTS: ContractRecord[] = [
	{
		id: 1,
		number: "П-2026-041",
		title: "Договор подряда на монолитные работы",
		counterparty: "ТОО СтройМонтаж",
		type: "Подряд",
		project: "ЖК Smart Estate",
		amount: "34 800 000 KGS",
		owner: "ПТО",
		status: "review",
		createdAt: "12.06.2026",
		dueAt: "20.06.2026",
		risk: "medium",
	},
	{
		id: 2,
		number: "ДДУ-412",
		title: "Договор долевого участия",
		counterparty: "Иванов Алексей Алексеевич",
		type: "ДДУ",
		project: "ЖК Smart Estate",
		amount: "8 193 300 KGS",
		owner: "CRM",
		status: "review",
		createdAt: "10.06.2026",
		dueAt: "18.06.2026",
		risk: "low",
	},
	{
		id: 3,
		number: "АР-2026-018",
		title: "Договор аренды офиса",
		counterparty: "ИП Нурланов К.",
		type: "Аренда",
		project: "БЦ Central",
		amount: "420 000 KGS / мес",
		owner: "Аренда",
		status: "approved",
		createdAt: "01.06.2026",
		dueAt: "05.06.2026",
		risk: "low",
	},
	{
		id: 4,
		number: "СН-2026-107",
		title: "Договор поставки арматуры",
		counterparty: "ТОО МеталлСервис",
		type: "Снабжение",
		project: "ЖК Smart Estate",
		amount: "12 600 000 KGS",
		owner: "Снабжение",
		status: "rejected",
		createdAt: "08.06.2026",
		dueAt: "15.06.2026",
		risk: "high",
	},
	{
		id: 5,
		number: "ДДУ-409",
		title: "Договор купли-продажи квартиры 1504",
		counterparty: "ОсОО Аманат Групп",
		type: "Продажа",
		project: "ЖК Smart Estate",
		amount: "6 516 000 KGS",
		owner: "CRM",
		status: "signed",
		createdAt: "27.05.2026",
		dueAt: "31.05.2026",
		risk: "low",
	},
];

const TEMPLATES = [
	{ name: "ДДУ физ. лицо", type: "Продажи", version: "v4.2", updated: "14.06.2026", owner: "Юрист" },
	{ name: "Договор подряда", type: "ПТО", version: "v3.1", updated: "10.06.2026", owner: "Юрист" },
	{ name: "Договор аренды", type: "Аренда", version: "v2.8", updated: "02.06.2026", owner: "УК" },
	{ name: "Поставка материалов", type: "Снабжение", version: "v1.9", updated: "25.05.2026", owner: "Юрист" },
];

const CLAIMS = [
	{ id: "ПР-018", subject: "Просрочка поставки арматуры", counterparty: "ТОО МеталлСервис", amount: "1 240 000 KGS", status: "sent" as ClaimStatus, due: "19.06.2026" },
	{ id: "ПР-017", subject: "Нарушение графика работ", counterparty: "ТОО СтройМонтаж", amount: "780 000 KGS", status: "answered" as ClaimStatus, due: "17.06.2026" },
	{ id: "ПР-016", subject: "Долг по аренде", counterparty: "ИП Сейткали", amount: "320 000 KGS", status: "draft" as ClaimStatus, due: "22.06.2026" },
];

const COURT_CASES = [
	{ id: "СД-009", subject: "Взыскание задолженности", party: "ИП Сейткали", claim: "320 000 KGS", status: "preparing" as CourtStatus, next: "Подготовить иск до 21.06.2026" },
	{ id: "СД-008", subject: "Неустойка за поставку", party: "ТОО МеталлСервис", claim: "1 240 000 KGS", status: "filed" as CourtStatus, next: "Заседание 28.06.2026" },
	{ id: "СД-007", subject: "Спор по качеству работ", party: "ТОО БетонСтрой", claim: "2 600 000 KGS", status: "hearing" as CourtStatus, next: "Экспертиза до 30.06.2026" },
];

const MODE_LABELS: Record<LegalMode, string> = {
	queue: "Очередь",
	registry: "Реестр договоров",
	templates: "Шаблоны",
	claims: "Претензии",
	court: "Судебные дела",
};

const STATUS_META: Record<ContractStatus, { label: string; className: string; icon: typeof Clock3 }> = {
	review: { label: "На согласовании", className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock3 },
	approved: { label: "Согласован", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
	rejected: { label: "Возвращён", className: "border-rose-200 bg-rose-50 text-rose-700", icon: XCircle },
	signed: { label: "Подписан", className: "border-cyan-200 bg-cyan-50 text-cyan-700", icon: Stamp },
};

function modeFromPath(path: string): LegalMode {
	if (path.includes("/templates")) return "templates";
	if (path.includes("/claims")) return "claims";
	if (path.includes("/court")) return "court";
	if (path.includes("/registry")) return "registry";
	return "queue";
}

function KpiCard({
	label,
	value,
	tone,
	icon: Icon,
}: {
	label: string;
	value: string | number;
	tone: "amber" | "emerald" | "rose" | "cyan";
	icon: typeof Scale;
}) {
	const toneClass = {
		amber: "border-amber-200/80 bg-amber-50/70 text-amber-700",
		emerald: "border-emerald-200/80 bg-emerald-50/70 text-emerald-700",
		rose: "border-rose-200/80 bg-rose-50/70 text-rose-700",
		cyan: "border-cyan-200/80 bg-cyan-50/70 text-cyan-700",
	}[tone];

	return (
		<div className={cn("rounded-[22px] border p-4 shadow-sm", toneClass)}>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p>
				<Icon className="h-4 w-4 opacity-70" />
			</div>
			<p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
		</div>
	);
}

function StatusBadge({ status }: { status: ContractStatus }) {
	const meta = STATUS_META[status];
	const Icon = meta.icon;
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", meta.className)}>
			<Icon className="h-3.5 w-3.5" />
			{meta.label}
		</span>
	);
}

function RiskBadge({ risk }: { risk: ContractRecord["risk"] }) {
	const className = {
		low: "border-emerald-200 bg-emerald-50 text-emerald-700",
		medium: "border-amber-200 bg-amber-50 text-amber-700",
		high: "border-rose-200 bg-rose-50 text-rose-700",
	}[risk];
	const label = { low: "Низкий", medium: "Средний", high: "Высокий" }[risk];
	return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>{label}</span>;
}

function LegalTabs({ mode }: { mode: LegalMode }) {
	const tabs: Array<{ mode: LegalMode; href: string; label: string; icon: typeof Scale }> = [
		{ mode: "queue", href: "/legal", label: "Очередь", icon: ShieldCheck },
		{ mode: "registry", href: "/legal/registry", label: "Реестр", icon: Archive },
		{ mode: "templates", href: "/legal/templates", label: "Шаблоны", icon: FileText },
		{ mode: "claims", href: "/legal/claims", label: "Претензии", icon: AlertTriangle },
		{ mode: "court", href: "/legal/court", label: "Суды", icon: Gavel },
	];

	return (
		<div className="am-shell-filter flex gap-1 overflow-x-auto p-1.5">
			{tabs.map((tab) => {
				const Icon = tab.icon;
				const active = tab.mode === mode;
				return (
					<Link key={tab.href} href={tab.href}>
						<div
							className={cn(
								"flex h-10 items-center gap-2 rounded-[16px] px-3 text-sm font-semibold transition-all whitespace-nowrap",
								active
									? "bg-slate-950 text-white shadow-lg shadow-slate-950/12"
									: "text-slate-600 hover:bg-white/80 hover:text-slate-950",
							)}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function ContractList({
	items,
	onApprove,
	onReject,
	showActions,
}: {
	items: ContractRecord[];
	onApprove: (id: number) => void;
	onReject: (id: number) => void;
	showActions?: boolean;
}) {
	return (
		<div className="am-card overflow-hidden rounded-[22px]">
			<div className="grid grid-cols-[1.5fr_1fr_0.85fr_0.8fr_0.9fr] gap-3 border-b border-slate-200/70 bg-slate-950 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75 max-lg:hidden">
				<span>Документ</span>
				<span>Контрагент</span>
				<span>Срок</span>
				<span>Риск</span>
				<span className="text-right">Статус</span>
			</div>
			<div className="divide-y divide-slate-100/90">
				{items.map((contract) => (
					<div key={contract.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 lg:grid-cols-[1.5fr_1fr_0.85fr_0.8fr_0.9fr] lg:items-center">
						<div className="min-w-0">
							<p className="font-semibold text-slate-950">{contract.title}</p>
							<p className="mt-1 text-xs text-slate-500">
								{contract.number} · {contract.type} · {contract.project}
							</p>
						</div>
						<div className="min-w-0 text-sm text-slate-700">
							<p className="truncate font-medium">{contract.counterparty}</p>
							<p className="mt-1 text-xs text-slate-500">{contract.amount}</p>
						</div>
						<div className="text-sm text-slate-600">
							<p>до {contract.dueAt}</p>
							<p className="mt-1 text-xs text-slate-400">создан {contract.createdAt}</p>
						</div>
						<RiskBadge risk={contract.risk} />
						<div className="flex items-center justify-between gap-2 lg:justify-end">
							<StatusBadge status={contract.status} />
							{showActions && contract.status === "review" && (
								<div className="flex gap-1">
									<Button size="sm" className="h-9 min-h-9 px-3" onClick={() => onApprove(contract.id)}>
										<CheckCircle2 className="h-4 w-4" />
									</Button>
									<Button size="sm" variant="outline" className="h-9 min-h-9 px-3 text-rose-700" onClick={() => onReject(contract.id)}>
										<XCircle className="h-4 w-4" />
									</Button>
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default function LegalPage() {
	const [location] = useLocation();
	const { toast } = useToast();
	const mode = modeFromPath(location);
	const [query, setQuery] = useState("");
	const [contracts, setContracts] = useState(CONTRACTS);

	const filteredContracts = useMemo(() => {
		const q = query.trim().toLowerCase();
		return contracts.filter((contract) => {
			const matchesMode =
				mode === "queue"
					? contract.status === "review"
					: mode === "registry"
						? true
						: false;
			if (!matchesMode) return false;
			if (!q) return true;
			return [contract.title, contract.number, contract.counterparty, contract.project, contract.type]
				.join(" ")
				.toLowerCase()
				.includes(q);
		});
	}, [contracts, mode, query]);

	const approve = (id: number) => {
		setContracts((current) => current.map((item) => (item.id === id ? { ...item, status: "approved" } : item)));
		toast({ title: "Договор согласован" });
	};

	const reject = (id: number) => {
		setContracts((current) => current.map((item) => (item.id === id ? { ...item, status: "rejected" } : item)));
		toast({ title: "Договор возвращён на доработку" });
	};

	const copyTemplate = (name: string) => {
		void navigator.clipboard?.writeText(name);
		toast({ title: "Название шаблона скопировано" });
	};

	const pending = contracts.filter((item) => item.status === "review").length;
	const approved = contracts.filter((item) => item.status === "approved" || item.status === "signed").length;
	const rejected = contracts.filter((item) => item.status === "rejected").length;

	return (
		<div className="am-page space-y-5">
			<header className="am-page-header">
				<div className="flex min-w-0 items-start gap-4">
					<div className="grid h-12 w-12 shrink-0 place-items-center rounded-[20px] bg-violet-100 text-violet-700">
						<Scale className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-700">Legal workspace</p>
						<h1 className="am-page-title mt-1 text-[28px]">{MODE_LABELS[mode]}</h1>
						<p className="am-page-subtitle text-sm">
							Согласование, юридический реестр, претензионная работа и судебный контроль.
						</p>
					</div>
				</div>
				<Button>
					<Plus className="h-4 w-4" />
					Новый документ
				</Button>
			</header>

			<div className="grid gap-3 md:grid-cols-4">
				<KpiCard label="На согласовании" value={pending} tone="amber" icon={Clock3} />
				<KpiCard label="Согласовано" value={approved} tone="emerald" icon={FileCheck2} />
				<KpiCard label="Возвращено" value={rejected} tone="rose" icon={XCircle} />
				<KpiCard label="Шаблонов" value={TEMPLATES.length} tone="cyan" icon={FileText} />
			</div>

			<LegalTabs mode={mode} />

			{(mode === "queue" || mode === "registry") && (
				<>
					<div className="am-shell-filter flex items-center gap-2 p-2">
						<div className="relative min-w-[240px] flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Поиск по договору, контрагенту, проекту..."
								className="h-10 rounded-[16px] border-slate-200/90 bg-white/85 pl-9"
							/>
						</div>
						<Button variant="outline" size="sm">
							<Send className="h-4 w-4" />
							Экспорт
						</Button>
					</div>
					<ContractList items={filteredContracts} onApprove={approve} onReject={reject} showActions={mode === "queue"} />
				</>
			)}

			{mode === "templates" && (
				<div className="grid gap-3 md:grid-cols-2">
					{TEMPLATES.map((template) => (
						<div key={template.name} className="am-card rounded-[22px] p-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-lg font-bold text-slate-950">{template.name}</p>
									<p className="mt-1 text-sm text-slate-500">{template.type} · {template.version}</p>
								</div>
								<Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">
									{template.owner}
								</Badge>
							</div>
							<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
								<p className="text-xs text-slate-500">Обновлен {template.updated}</p>
								<Button variant="outline" size="sm" onClick={() => copyTemplate(template.name)}>
									<Copy className="h-4 w-4" />
									Использовать
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{mode === "claims" && (
				<div className="am-card overflow-hidden rounded-[22px]">
					{CLAIMS.map((claim) => (
						<div key={claim.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[0.7fr_1.4fr_1fr_0.8fr_0.8fr] md:items-center">
							<p className="font-bold text-slate-950">{claim.id}</p>
							<div>
								<p className="font-semibold text-slate-900">{claim.subject}</p>
								<p className="text-sm text-slate-500">{claim.counterparty}</p>
							</div>
							<p className="text-sm font-semibold text-slate-700">{claim.amount}</p>
							<Badge variant="outline" className="w-fit rounded-full border-amber-200 bg-amber-50 text-amber-700">{claim.status}</Badge>
							<p className="text-sm text-slate-500">до {claim.due}</p>
						</div>
					))}
				</div>
			)}

			{mode === "court" && (
				<div className="grid gap-3">
					{COURT_CASES.map((courtCase) => (
						<div key={courtCase.id} className="am-card rounded-[22px] p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-lg font-bold text-slate-950">{courtCase.subject}</p>
									<p className="mt-1 text-sm text-slate-500">{courtCase.id} · {courtCase.party}</p>
								</div>
								<Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 text-violet-700">{courtCase.status}</Badge>
							</div>
							<div className="mt-4 grid gap-3 rounded-[18px] border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Сумма иска</p>
									<p className="mt-1 font-bold text-slate-950">{courtCase.claim}</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Следующее действие</p>
									<p className="mt-1 font-medium text-slate-700">{courtCase.next}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
