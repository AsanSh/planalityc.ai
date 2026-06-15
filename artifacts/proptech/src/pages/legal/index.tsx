import { FileText, Clock, CheckCircle, AlertCircle, Scale } from "lucide-react";
import { Link } from "wouter";

const MOCK_CONTRACTS = [
	{
		id: 1,
		title: "Договор подряда №П-2024-041",
		counterparty: "ТОО «СтройМонтаж»",
		type: "Подряд",
		status: "review",
		createdAt: "12.06.2026",
		dueAt: "20.06.2026",
	},
	{
		id: 2,
		title: "ДДУ №412 — Иванов А.А.",
		counterparty: "Иванов Алексей Алексеевич",
		type: "ДДУ",
		status: "review",
		createdAt: "10.06.2026",
		dueAt: "18.06.2026",
	},
	{
		id: 3,
		title: "Договор аренды офиса",
		counterparty: "ИП Нурланов К.",
		type: "Аренда",
		status: "approved",
		createdAt: "01.06.2026",
		dueAt: "05.06.2026",
	},
	{
		id: 4,
		title: "Договор поставки арматуры",
		counterparty: "ТОО «МеталлСервис»",
		type: "Снабжение",
		status: "rejected",
		createdAt: "08.06.2026",
		dueAt: "15.06.2026",
	},
];

const STATUS_CFG = {
	review: {
		label: "На согласовании",
		icon: Clock,
		bg: "bg-amber-50",
		text: "text-amber-700",
		border: "border-amber-200",
	},
	approved: {
		label: "Согласован",
		icon: CheckCircle,
		bg: "bg-emerald-50",
		text: "text-emerald-700",
		border: "border-emerald-200",
	},
	rejected: {
		label: "Отклонён",
		icon: AlertCircle,
		bg: "bg-red-50",
		text: "text-red-700",
		border: "border-red-200",
	},
} as const;

export default function LegalPage() {
	const pending = MOCK_CONTRACTS.filter((c) => c.status === "review");
	const approved = MOCK_CONTRACTS.filter((c) => c.status === "approved");
	const rejected = MOCK_CONTRACTS.filter((c) => c.status === "rejected");

	return (
		<div className="mx-auto max-w-4xl space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
					<Scale className="h-5 w-5 text-violet-600" />
				</div>
				<div>
					<h1 className="text-xl font-semibold text-slate-800">Юрист</h1>
					<p className="text-sm text-slate-500">Согласование договоров и юридический контроль</p>
				</div>
				<span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
					Модуль в разработке
				</span>
			</div>

			{/* KPI cards */}
			<div className="grid grid-cols-3 gap-4">
				{[
					{ label: "На согласовании", value: pending.length, color: "text-amber-600", bg: "bg-amber-50" },
					{ label: "Согласовано", value: approved.length, color: "text-emerald-600", bg: "bg-emerald-50" },
					{ label: "Отклонено", value: rejected.length, color: "text-red-600", bg: "bg-red-50" },
				].map((kpi) => (
					<div key={kpi.label} className={`rounded-xl border border-slate-200 ${kpi.bg} p-4`}>
						<p className="text-xs text-slate-500">{kpi.label}</p>
						<p className={`mt-1 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
					</div>
				))}
			</div>

			{/* Contract queue */}
			<div className="rounded-xl border border-slate-200 bg-white">
				<div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
					<FileText className="h-4 w-4 text-slate-400" />
					<span className="text-sm font-medium text-slate-700">Очередь договоров</span>
				</div>
				<div className="divide-y divide-slate-100">
					{MOCK_CONTRACTS.map((contract) => {
						const cfg = STATUS_CFG[contract.status];
						const Icon = cfg.icon;
						return (
							<div key={contract.id} className="flex items-center gap-4 px-4 py-3">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-slate-800">{contract.title}</p>
									<p className="text-xs text-slate-500">
										{contract.counterparty} · {contract.type}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-slate-400">до {contract.dueAt}</p>
								</div>
								<span
									className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
								>
									<Icon className="h-3 w-3" />
									{cfg.label}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Coming soon notice */}
			<div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-5 text-center">
				<p className="text-sm font-medium text-violet-700">Полный функционал в разработке</p>
				<p className="mt-1 text-xs text-violet-500">
					Шаблоны договоров, электронная подпись, реестр претензий, судебные дела
				</p>
				<div className="mt-3 flex flex-wrap justify-center gap-2">
					{["Реестр договоров", "Шаблоны", "Претензии", "Судебные дела", "ЭЦП"].map((tag) => (
						<span
							key={tag}
							className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-600"
						>
							{tag}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
