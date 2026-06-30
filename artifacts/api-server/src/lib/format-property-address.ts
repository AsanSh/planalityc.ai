export type PropertyAddressParts = {
	unitNumber?: string | null;
	projectName?: string | null;
	block?: string | null;
	floor?: number | null;
};

/** Номер объекта + проект/локация + блок/этаж при наличии. */
export function formatPropertyFullAddress(
	p: PropertyAddressParts | null | undefined,
): string | null {
	if (!p?.unitNumber && !p?.projectName) return null;
	const parts: string[] = [];
	if (p.unitNumber?.trim()) parts.push(p.unitNumber.trim());
	if (p.projectName?.trim()) parts.push(p.projectName.trim());
	if (p.block?.trim()) parts.push(`блок ${p.block.trim()}`);
	if (p.floor != null && !Number.isNaN(p.floor)) parts.push(`эт. ${p.floor}`);
	return parts.length > 0 ? parts.join(", ") : null;
}
