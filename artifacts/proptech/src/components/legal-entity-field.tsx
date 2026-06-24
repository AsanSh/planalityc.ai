/**
 * ОсОО (legal-entity) picker for finance create/edit forms.
 *
 * Reuses GET /legal-entities. Value is the entity id (or null = "не указано").
 * Forms typically default this to the current scope's legalEntityId and send
 * the chosen value as `legalEntityId` in the create/update body.
 */

import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

type LegalEntity = { id: number; name: string; isActive?: boolean };

const NONE = "__none__";

export function LegalEntityField({
	value,
	onChange,
	label = "ОсОО",
	className,
	allowNone = true,
}: {
	value: number | null;
	onChange: (id: number | null) => void;
	label?: string;
	className?: string;
	allowNone?: boolean;
}) {
	const { data: legalRaw = [] } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () =>
			api.get<LegalEntity[]>("/legal-entities").then((r) => r.data),
	});

	const legalEntities = (Array.isArray(legalRaw) ? legalRaw : []).filter(
		(e) => e.isActive !== false,
	);

	return (
		<div className={`flex flex-col ${className ?? ""}`}>
			<Label className="text-xs leading-tight mb-1.5">{label}</Label>
			<Select
				value={value != null ? String(value) : NONE}
				onValueChange={(v) => onChange(v === NONE ? null : parseInt(v, 10))}
			>
				<SelectTrigger className="mt-auto h-8 text-sm">
					<SelectValue placeholder="Не указано" />
				</SelectTrigger>
				<SelectContent>
					{allowNone && <SelectItem value={NONE}>Не указано</SelectItem>}
					{legalEntities.map((le) => (
						<SelectItem key={le.id} value={String(le.id)}>
							{le.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
