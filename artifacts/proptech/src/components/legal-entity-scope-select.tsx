/**
 * Compact ОсОО (legal-entity) selector for FINANCE pages.
 *
 * Reuses the GET /legal-entities endpoint and the URL-backed
 * use-legal-entity-scope hook. Drop it into a finance page header; selecting
 * an entity writes ?legalEntityId= to the URL, which the page's queries read.
 */

import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLegalEntityScope } from "@/hooks/use-legal-entity-scope";
import { api } from "@/lib/api";

type LegalEntity = { id: number; name: string; isActive?: boolean };

export function LegalEntityScopeSelect({
	className,
}: {
	className?: string;
}) {
	const { legalEntityId, setLegalEntityId } = useLegalEntityScope();

	const { data: legalRaw = [] } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () =>
			api.get<LegalEntity[]>("/legal-entities").then((r) => r.data),
	});

	const legalEntities = (Array.isArray(legalRaw) ? legalRaw : []).filter(
		(e) => e.isActive !== false,
	);

	return (
		<Select
			value={legalEntityId != null ? String(legalEntityId) : "all"}
			onValueChange={(v) =>
				setLegalEntityId(v === "all" ? null : parseInt(v, 10))
			}
		>
			<SelectTrigger
				className={className ?? "h-8 w-[200px] bg-white text-xs"}
			>
				<SelectValue placeholder="Все ОсОО" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">Все ОсОО</SelectItem>
				{legalEntities.map((le) => (
					<SelectItem key={le.id} value={String(le.id)}>
						{le.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
