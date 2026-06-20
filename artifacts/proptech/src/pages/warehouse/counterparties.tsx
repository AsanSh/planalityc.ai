import { CounterpartyDirectory } from "@/components/counterparty-directory";

export default function WarehouseCounterparties() {
	return (
		<CounterpartyDirectory
			title="Контрагенты · Снабжение"
			subtitle="Поставщики материалов для снабжения"
			allowedRoles={["material_supplier"]}
			defaultRole="material_supplier"
		/>
	);
}
