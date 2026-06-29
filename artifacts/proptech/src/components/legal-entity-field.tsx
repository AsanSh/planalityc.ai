/**
 * ОсОО (legal-entity) picker for finance create/edit forms.
 *
 * Reuses GET /legal-entities. Value is the entity id (or null = "не указано").
 * Forms typically default this to the current scope's legalEntityId and send
 * the chosen value as `legalEntityId` in the create/update body.
 */

import { useEffect } from "react";
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
	required = false,
}: {
	value: number | null;
	onChange: (id: number | null) => void;
	label?: string;
	className?: string;
	allowNone?: boolean;
	/** Обязательное поле: убирает «Не указано» и авто-выбирает единственное ОсОО. */
	required?: boolean;
}) {
	const { data: legalRaw = [] } = useQuery({
		queryKey: ["legal-entities"],
		queryFn: () =>
			api.get<LegalEntity[]>("/legal-entities").then((r) => r.data),
	});

	const legalEntities = (Array.isArray(legalRaw) ? legalRaw : []).filter(
		(e) => e.isActive !== false,
	);
	const showNone = allowNone && !required;

	// Если поле обязательное и ОсОО ровно одно — выбираем его автоматически.
	useEffect(() => {
		if (required && value == null && legalEntities.length === 1) {
			onChange(legalEntities[0].id);
		}
	}, [required, value, legalEntities, onChange]);

	return (
		<div className={`flex flex-col ${className ?? ""}`}>
			<Label className="text-xs leading-tight mb-1.5">
				{label}
				{required && <span className="text-rose-500"> *</span>}
			</Label>
			<Select
				value={value != null ? String(value) : NONE}
				onValueChange={(v) => onChange(v === NONE ? null : parseInt(v, 10))}
			>
				<SelectTrigger className="mt-auto h-8 text-sm">
					<SelectValue placeholder={required ? "Выберите ОсОО" : "Не указано"} />
				</SelectTrigger>
				<SelectContent>
					{showNone && <SelectItem value={NONE}>Не указано</SelectItem>}
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
