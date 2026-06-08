import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

export function HistoryTab({ unitId }: { unitId: number }) {
	const { data: rows = [], isLoading } = useQuery<SupplementRow[]>({
		queryKey: ["construction-unit-supplements", unitId],
		queryFn: () => api.get(`/construction/units/${unitId}/supplements`).then((r) => r.data),
		enabled: unitId > 0,
	});

	if (isLoading) {
		return <p className="text-sm text-slate-500">Загрузка…</p>;
	}

	if (rows.length === 0) {
		return (
			<p className="text-sm text-slate-500 py-6 text-center">
				История изменений пуста
			</p>
		);
	}

	return (
		<ul className="space-y-2 text-sm">
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
