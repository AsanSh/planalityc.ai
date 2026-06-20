import { ExternalLink, FileText } from "lucide-react";
import { Link } from "wouter";
import { ContractFileUpload } from "@/components/contract-file-upload";
import { Button } from "@/components/ui/button";
import type { SalesGridUnit } from "../types";

export function DocsTab({
	unit,
	onSaved,
}: {
	unit: SalesGridUnit;
	onSaved: () => void;
}) {
	const contract = unit.contract;
	const contractUrl = contract
		? `/construction/contracts-sales?highlight=${contract.id}&status=${contract.status || "all"}`
		: "/construction/contracts-sales";

	if (!contract) {
		return (
			<div className="space-y-3 text-sm text-slate-600">
				<p className="font-medium text-slate-900">Договор ещё не оформлен</p>
				<p>
					После продажи или брони здесь появятся договор ДКП, загрузка подписанного
					скана и связанные документы по юниту.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 text-sm">
			<div className="rounded-xl border border-slate-200 bg-white p-3">
				<div className="flex items-start gap-2">
					<FileText className="mt-0.5 h-4 w-4 text-amber-600" />
					<div className="min-w-0 flex-1">
						<p className="font-semibold text-slate-900">
							Договор № {contract.contractNumber || contract.id}
						</p>
						<p className="text-xs text-slate-500">
							{contract.buyerName || "Покупатель не указан"}
							{contract.contractDate ? ` · ${contract.contractDate}` : ""}
						</p>
					</div>
				</div>
				<Link href={contractUrl}>
					<Button variant="outline" size="sm" className="mt-3 gap-1.5">
						<ExternalLink className="h-3.5 w-3.5" />
						Открыть договор
					</Button>
				</Link>
			</div>

			<ContractFileUpload
				entityType="buyer"
				entityId={contract.id}
				contractDocument={contract.contractDocument ?? null}
				onUploaded={onSaved}
			/>

			<div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
				<p className="font-medium text-slate-700">Где хранится договор</p>
				<p className="mt-1">
					Подписанный скан хранится у договора ДКП. Шахматка показывает его здесь,
					чтобы из юнита можно было продолжить работу без дублирования файлов.
				</p>
			</div>
		</div>
	);
}
