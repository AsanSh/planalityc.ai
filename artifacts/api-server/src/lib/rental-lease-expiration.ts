import { and, eq, gt, gte, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db, accrualsTable, leaseContractsTable } from "./db";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Обновляет rentalStatus объекта: «free», если нет активных договоров. */
export async function refreshPropertyRentalStatus(
  propertyId: number,
  companyId?: number,
): Promise<void> {
  const { propertiesTable } = await import("./db/schema/properties");
  const conditions: SQL[] = [
    eq(leaseContractsTable.propertyId, propertyId),
    eq(leaseContractsTable.status, "active"),
  ];
  if (companyId != null) conditions.push(eq(leaseContractsTable.companyId, companyId));
  const [active] = await db.select({ id: leaseContractsTable.id }).from(leaseContractsTable).where(and(...conditions));
  const propConditions: SQL[] = [eq(propertiesTable.id, propertyId)];
  if (companyId != null) propConditions.push(eq(propertiesTable.companyId, companyId));
  await db
    .update(propertiesTable)
    .set({ rentalStatus: active ? "rented" : "free" })
    .where(and(...propConditions));
}

/**
 * Активные договоры с endDate < сегодня → status expired, объект освобождается.
 * tenantId в договоре сохраняется для истории; связь «объект занят» снимается через rentalStatus.
 */
export async function expireOverdueLeaseContracts(companyId?: number): Promise<number> {
  const today = todayIsoDate();
  const conditions: SQL[] = [
    eq(leaseContractsTable.status, "active"),
    isNotNull(leaseContractsTable.endDate),
    lt(leaseContractsTable.endDate, today),
  ];
  if (companyId != null) conditions.push(eq(leaseContractsTable.companyId, companyId));

  const overdue = await db
    .select()
    .from(leaseContractsTable)
    .where(and(...conditions));

  if (overdue.length === 0) return 0;

  const propertyIds = new Set<number>();

  for (const contract of overdue) {
    const note = `Истёк автоматически ${today} (дата окончания ${contract.endDate})`;
    const comment = [contract.comment, note].filter(Boolean).join("\n");

    await db
      .update(leaseContractsTable)
      .set({ status: "expired", comment })
      .where(eq(leaseContractsTable.id, contract.id));

    const pendingAccruals = await db.select().from(accrualsTable).where(
      and(
        eq(accrualsTable.leaseContractId, contract.id),
        inArray(accrualsTable.status, ["pending", "overdue", "approved"]),
        gt(accrualsTable.dueDate, contract.endDate!),
      ),
    );
    for (const a of pendingAccruals) {
      const paid = parseFloat(a.paidAmount || "0");
      if (paid > 0) continue;
      await db
        .update(accrualsTable)
        .set({
          status: "cancelled",
          balance: "0",
          notes: [a.notes, `Отменено: договор истёк ${contract.endDate}`].filter(Boolean).join(" · "),
        })
        .where(eq(accrualsTable.id, a.id));
    }

    propertyIds.add(contract.propertyId);
  }

  for (const propertyId of propertyIds) {
    await refreshPropertyRentalStatus(propertyId, companyId);
  }

  return overdue.length;
}

/**
 * Истёкшие договоры, у которых дату окончания продлили (endDate ≥ сегодня или
 * сняли) → возвращаются в статус «active», объект снова занимается.
 */
export async function reactivateProlongedLeaseContracts(companyId?: number): Promise<number> {
  const today = todayIsoDate();
  const conditions: SQL[] = [
    eq(leaseContractsTable.status, "expired"),
    or(isNull(leaseContractsTable.endDate), gte(leaseContractsTable.endDate, today))!,
  ];
  if (companyId != null) conditions.push(eq(leaseContractsTable.companyId, companyId));

  const prolonged = await db.select().from(leaseContractsTable).where(and(...conditions));
  if (prolonged.length === 0) return 0;

  for (const contract of prolonged) {
    const note = `Активирован автоматически ${today} (продление до ${contract.endDate ?? "бессрочно"})`;
    const comment = [contract.comment, note].filter(Boolean).join("\n");
    await db
      .update(leaseContractsTable)
      .set({ status: "active", comment })
      .where(eq(leaseContractsTable.id, contract.id));
    await refreshPropertyRentalStatus(contract.propertyId, companyId);
  }

  return prolonged.length;
}
