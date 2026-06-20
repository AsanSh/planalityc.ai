import { and, eq } from "drizzle-orm";
import {
  companiesTable,
  db,
  legalEntitiesTable,
  rolesTable,
} from "./db";

const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}> = [
  {
    name: "Администратор",
    description: "Полный доступ к настройкам и данным компании",
    permissions: ["admin.all"],
    isSystem: true,
  },
  {
    name: "Бухгалтер",
    description: "Финансы, отчёты и контрагенты",
    permissions: [
      "finance.read",
      "finance.write",
      "finance.reports",
      "counterparties.read",
      "counterparties.write",
      "settings.read",
    ],
    isSystem: true,
  },
  {
    name: "Менеджер продаж",
    description: "CRM и шахматка продаж",
    permissions: [
      "construction.read",
      "construction.write",
      "counterparties.read",
      "counterparties.write",
    ],
    isSystem: true,
  },
  {
    name: "Менеджер аренды",
    description: "Договоры аренды и платежи",
    permissions: [
      "rental.read",
      "rental.write",
      "rental.payments",
      "counterparties.read",
    ],
    isSystem: true,
  },
];

/** Если справочник пуст — создаём юр. лицо из карточки компании (организация в /settings). */
export async function ensureLegalEntitiesFromCompany(
  companyId: number,
): Promise<void> {
  const [existing] = await db
    .select({ id: legalEntitiesTable.id })
    .from(legalEntitiesTable)
    .where(eq(legalEntitiesTable.companyId, companyId))
    .limit(1);
  if (existing) return;

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));
  if (!company?.name) return;

  const inn =
    company.bin?.trim() ||
    `ORG${String(companyId).padStart(10, "0").slice(-10)}`;

  await db.insert(legalEntitiesTable).values({
    companyId,
    name: company.name,
    fullLegalName: company.legalName?.trim() || company.name,
    inn,
    address: company.address || null,
    phone: company.phone || null,
    email: company.email || null,
    isActive: true,
  });
}

export async function resolveCompanyLegalEntityId(
  companyId: number,
  rawLegalEntityId?: unknown,
): Promise<number | null> {
  await ensureLegalEntitiesFromCompany(companyId);

  const hasExplicitValue =
    rawLegalEntityId !== undefined &&
    rawLegalEntityId !== null &&
    rawLegalEntityId !== "" &&
    rawLegalEntityId !== "none";

  if (hasExplicitValue) {
    const legalEntityId = Number(rawLegalEntityId);
    if (!Number.isInteger(legalEntityId)) {
      throw new Error("INVALID_LEGAL_ENTITY");
    }

    const [entity] = await db
      .select({ id: legalEntitiesTable.id })
      .from(legalEntitiesTable)
      .where(
        and(
          eq(legalEntitiesTable.id, legalEntityId),
          eq(legalEntitiesTable.companyId, companyId),
          eq(legalEntitiesTable.isActive, true),
        ),
      )
      .limit(1);

    if (!entity) {
      throw new Error("LEGAL_ENTITY_NOT_FOUND");
    }
    return entity.id;
  }

  const [first] = await db
    .select({ id: legalEntitiesTable.id })
    .from(legalEntitiesTable)
    .where(
      and(
        eq(legalEntitiesTable.companyId, companyId),
        eq(legalEntitiesTable.isActive, true),
      ),
    )
    .limit(1);

  return first?.id ?? null;
}

/** Если ролей нет — создаём базовый набор (как в UI настроек). */
export async function ensureDefaultCompanyRoles(companyId: number): Promise<void> {
  const [existing] = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.companyId, companyId))
    .limit(1);
  if (existing) return;

  await db.insert(rolesTable).values(
    DEFAULT_ROLES.map((r) => ({
      companyId,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      isSystem: r.isSystem,
      isActive: true,
    })),
  );
}
