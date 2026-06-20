import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SalesGridUnit } from "../types";

type SupplementRow = {
	id: number;
	oldArea: string;
	newArea: string;
	pricePerSqm: string;
	balanceDelta: string;
	currency: string;
	status: string;
	createdAt: string;
};

export function HistoryTab({ unit }: { unit: SalesGridUnit }) {
	const unitId = unit.id;
	const { data: rows = [], isLoading } = useQuery<SupplementRow[]>({
		queryKey: ["construction-unit-supplements", unitId],
		queryFn: () => api.get(`/construction/units/${unitId}/supplements`).then((r) => r.data),
		enabled: unitId > 0,
	});

	if (isLoading) {
		return <p className="text-sm text-slate-500">Загрузка…</p>;
	}

	const events = [
		unit.contract
			? {
					id: `contract-${unit.contract.id}`,
					title: `Договор № ${unit.contract.contractNumber || unit.contract.id}`,
					meta: [
						unit.contract.buyerName,
						unit.contract.status ? `статус: ${unit.contract.status}` : null,
					]
						.filter(Boolean)
						.join(" · "),
					date: unit.contract.contractDate,
				}
			: null,
		unit.contract?.contractDocument
			? {
					id: `contract-doc-${unit.contract.id}`,
					title: `Загружен файл договора`,
					meta: unit.contract.contractDocument.fileName,
					date: unit.contract.contractDocument.uploadedAt,
				}
			: null,
	].filter(Boolean) as Array<{
		id: string;
		title: string;
		meta?: string;
		date?: string | null;
	}>;

	if (rows.length === 0 && events.length === 0) {
		return (
			<p className="text-sm text-slate-500 py-6 text-center">
				История изменений пуста
			</p>
		);
	}

	return (
		<ul className="space-y-2 text-sm">
			{events.map((event) => (
				<li key={event.id} className="rounded-lg border border-slate-100 p-2">
					<p className="font-medium">{event.title}</p>
					{event.meta && <p className="text-xs text-slate-500">{event.meta}</p>}
					{event.date && (
						<p className="text-xs text-slate-400 mt-0.5">
							{new Date(event.date).toLocaleString("ru-KG")}
						</p>
					)}
				</li>
			))}
			{rows.map((r) => (
				<li key={r.id} className="rounded-lg border border-slate-100 p-2">
					<p className="font-medium">
						{r.oldArea} → {r.newArea} м²
					</p>
					<p className="text-xs text-slate-500">
						{new Date(r.createdAt).toLocaleString("ru-KG")} · {r.status}
					</p>
					{r.balanceDelta && (
						<p className="text-xs font-mono text-slate-600 mt-0.5">
							Δ {r.balanceDelta} {r.currency === "KGS" ? "сом" : r.currency}
						</p>
					)}
				</li>
			))}
		</ul>
	);
}
