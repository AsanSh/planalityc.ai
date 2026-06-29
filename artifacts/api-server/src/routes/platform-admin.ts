import { Router } from "express";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  bankAccountsTable,
  companiesTable,
  legalEntitiesTable,
  marketplaceOrdersTable,
  marketplaceProductsTable,
  moduleSettingsTable,
  usersTable,
} from "../lib/db";
import {
  requireAuth,
  requireSuperAdmin,
  AuthenticatedRequest,
} from "../middleware/auth";
import { AVAILABLE_MODULES } from "../lib/module-registry";
import { initiatePasswordReset } from "../lib/password-reset";
import { hashPassword, validatePassword } from "../lib/security";

const router: ReturnType<typeof Router> = Router();

// GET /platform-admin/dashboard — сводка по платформе
router.get(
  "/platform-admin/dashboard",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const [{ total: companiesTotal }] = await db
      .select({ total: count() })
      .from(companiesTable);
    const [{ total: companiesActive }] = await db
      .select({ total: count() })
      .from(companiesTable)
      .where(eq(companiesTable.isActive, true));
    const [{ total: usersTotal }] = await db
      .select({ total: count() })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"));

    const recentCompanies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt))
      .limit(10);

    const companiesWithUsers = await db
      .select({
        companyId: usersTable.companyId,
        usersCount: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"))
      .groupBy(usersTable.companyId);

    const avgUsersPerCompany =
      companiesTotal > 0
        ? Math.round((Number(usersTotal) / Number(companiesTotal)) * 10) / 10
        : 0;

    res.json({
      stats: {
        companiesTotal: Number(companiesTotal),
        companiesActive: Number(companiesActive),
        companiesInactive: Number(companiesTotal) - Number(companiesActive),
        usersTotal: Number(usersTotal),
        avgUsersPerCompany,
      },
      recentCompanies,
      topCompaniesByUsers: companiesWithUsers
        .filter((r) => r.companyId != null)
        .sort((a, b) => b.usersCount - a.usersCount)
        .slice(0, 5),
    });
  }
);

// GET /platform-admin/companies — все зарегистрированные компании
router.get(
  "/platform-admin/companies",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt));

    const userCounts = await db
      .select({
        companyId: usersTable.companyId,
        usersCount: count(),
      })
      .from(usersTable)
      .where(ne(usersTable.role, "super_admin"))
      .groupBy(usersTable.companyId);

    const countByCompany = new Map(
      userCounts
        .filter((r) => r.companyId != null)
        .map((r) => [r.companyId!, Number(r.usersCount)])
    );

    res.json(
      companies.map((c) => ({
        ...c,
        usersCount: countByCompany.get(c.id) ?? 0,
      }))
    );
  }
);

// GET /platform-admin/companies/:id
router.get(
  "/platform-admin/companies/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, id));
    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }

    const [users, moduleRows, legalEntities, bankAccounts] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          phone: usersTable.phone,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          role: usersTable.role,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(
          and(eq(usersTable.companyId, id), ne(usersTable.role, "super_admin"))
        )
        .orderBy(usersTable.createdAt),
      db
        .select()
        .from(moduleSettingsTable)
        .where(eq(moduleSettingsTable.companyId, id)),
      db
        .select()
        .from(legalEntitiesTable)
        .where(eq(legalEntitiesTable.companyId, id))
        .orderBy(desc(legalEntitiesTable.createdAt)),
      db
        .select()
        .from(bankAccountsTable)
        .where(eq(bankAccountsTable.companyId, id))
        .orderBy(desc(bankAccountsTable.createdAt)),
    ]);

    const moduleByKey = new Map(moduleRows.map((row) => [row.moduleKey, row]));
    const modules = AVAILABLE_MODULES.map((module) => {
      const row = moduleByKey.get(module.key);
      return {
        ...module,
        rowId: row?.id ?? null,
        isEnabled: row?.isEnabled ?? false,
        enabledAt: row?.enabledAt ?? null,
        settings: row?.settings ?? null,
      };
    });

    res.json({
      company,
      users,
      modules,
      legalEntities,
      bankAccounts,
      summary: {
        usersTotal: users.length,
        usersActive: users.filter((user) => user.isActive).length,
        usersInactive: users.filter((user) => !user.isActive).length,
        modulesEnabled: modules.filter((module) => module.isEnabled).length,
        legalEntities: legalEntities.length,
        bankAccounts: bankAccounts.length,
      },
    });
  }
);

// PATCH /platform-admin/companies/:id
router.patch(
  "/platform-admin/companies/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const { name, legalName, bin, phone, email, address, isActive } = req.body;

    const [company] = await db
      .update(companiesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(bin !== undefined && { bin }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(companiesTable.id, id))
      .returning();

    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }
    res.json(company);
  }
);

// PATCH /platform-admin/companies/:id/modules/:key — включить / отключить модуль компании
router.patch(
  "/platform-admin/companies/:id/modules/:key",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const companyId = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const moduleKey = Array.isArray(req.params.key)
      ? req.params.key[0]
      : req.params.key;
    const moduleMeta = AVAILABLE_MODULES.find((module) => module.key === moduleKey);
    if (!moduleMeta) {
      res.status(400).json({ error: "Неизвестный модуль" });
      return;
    }

    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId));
    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }

    const isEnabled = Boolean(req.body.isEnabled);
    const settings =
      req.body.settings === undefined
        ? undefined
        : typeof req.body.settings === "string"
          ? req.body.settings
          : JSON.stringify(req.body.settings ?? {});

    const [existing] = await db
      .select()
      .from(moduleSettingsTable)
      .where(
        and(
          eq(moduleSettingsTable.companyId, companyId),
          eq(moduleSettingsTable.moduleKey, moduleKey)
        )
      );

    const [row] = existing
      ? await db
          .update(moduleSettingsTable)
          .set({
            isEnabled,
            enabledAt: isEnabled ? existing.enabledAt ?? new Date() : null,
            ...(settings !== undefined && { settings }),
            updatedAt: new Date(),
          })
          .where(eq(moduleSettingsTable.id, existing.id))
          .returning()
      : await db
          .insert(moduleSettingsTable)
          .values({
            companyId,
            moduleKey,
            isEnabled,
            enabledAt: isEnabled ? new Date() : null,
            settings: settings ?? null,
          })
          .returning();

    res.json({
      ...moduleMeta,
      rowId: row.id,
      isEnabled: row.isEnabled,
      enabledAt: row.enabledAt,
      settings: row.settings,
    });
  }
);

// PATCH /platform-admin/legal-entities/:id — управление юрлицами компании
router.patch(
  "/platform-admin/legal-entities/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const {
      name,
      fullLegalName,
      inn,
      address,
      phone,
      email,
      directorName,
      accountant,
      isActive,
    } = req.body;

    const [row] = await db
      .update(legalEntitiesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(fullLegalName !== undefined && { fullLegalName }),
        ...(inn !== undefined && { inn }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(directorName !== undefined && { directorName }),
        ...(accountant !== undefined && { accountant }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(legalEntitiesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Юрлицо не найдено" });
      return;
    }
    res.json(row);
  }
);

// PATCH /platform-admin/bank-accounts/:id — управление счетами компании
router.patch(
  "/platform-admin/bank-accounts/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const {
      legalEntityId,
      module,
      name,
      type,
      bank,
      bik,
      accountNumber,
      currency,
      openingBalance,
      currentBalance,
      isActive,
      notes,
    } = req.body;

    const [row] = await db
      .update(bankAccountsTable)
      .set({
        ...(legalEntityId !== undefined && {
          legalEntityId: legalEntityId ? Number(legalEntityId) : null,
        }),
        ...(module !== undefined && { module }),
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(bank !== undefined && { bank }),
        ...(bik !== undefined && { bik }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(currency !== undefined && { currency }),
        ...(openingBalance !== undefined && { openingBalance: String(openingBalance) }),
        ...(currentBalance !== undefined && { currentBalance: String(currentBalance) }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes }),
      })
      .where(eq(bankAccountsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Счёт не найден" });
      return;
    }
    res.json(row);
  }
);

// PATCH /platform-admin/users/:id — блокировка / роль (кроме super_admin)
router.patch(
  "/platform-admin/users/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10
    );
    const { isActive, role, firstName, lastName, email, phone } = req.body;

    if (role === "super_admin") {
      res.status(403).json({
        error: "Роль супер-администратора назначается только через систему",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя изменять учётную запись платформы" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({
        ...(isActive !== undefined && { isActive }),
        ...(role !== undefined && { role }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    const { passwordHash: _ph, ...safe } = user;
    res.json(safe);
  }
);

// PATCH /platform-admin/users/:id/password — задать пароль (платформа)
router.patch(
  "/platform-admin/users/:id/password",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Пароль обязателен" });
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: passwordValidation.error });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя менять пароль супер-администратора" });
      return;
    }

    await db
      .update(usersTable)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    res.json({ success: true });
  },
);

// POST /platform-admin/users/:id/send-password-reset
router.post(
  "/platform-admin/users/:id/send-password-reset",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      10,
    );

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ error: "Нельзя сбрасывать пароль супер-администратора" });
      return;
    }

    try {
      const result = await initiatePasswordReset(existing.id);
      res.json({
        success: true,
        message: result.emailSent
          ? `Ссылка отправлена на ${result.email}`
          : `Передайте ссылку вручную: ${result.email}`,
        emailSent: result.emailSent,
        resetLink: result.resetLink,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "USER_INACTIVE") {
        res.status(400).json({ error: "Пользователь заблокирован" });
        return;
      }
      res.status(500).json({ error: "Не удалось создать ссылку для сброса" });
    }
  },
);

// ── Маркетплейс: заявки (каталог/поставщики/импорт — platform-admin-marketplace.ts) ──

router.get(
  "/platform-admin/marketplace/orders",
  requireAuth,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const orders = await db
      .select({
        id: marketplaceOrdersTable.id,
        companyId: marketplaceOrdersTable.companyId,
        companyName: companiesTable.name,
        productId: marketplaceOrdersTable.productId,
        productName: marketplaceProductsTable.name,
        quantity: marketplaceOrdersTable.quantity,
        totalAmount: marketplaceOrdersTable.totalAmount,
        currency: marketplaceOrdersTable.currency,
        projectId: marketplaceOrdersTable.projectId,
        status: marketplaceOrdersTable.status,
        notes: marketplaceOrdersTable.notes,
        createdAt: marketplaceOrdersTable.createdAt,
      })
      .from(marketplaceOrdersTable)
      .leftJoin(companiesTable, eq(marketplaceOrdersTable.companyId, companiesTable.id))
      .leftJoin(
        marketplaceProductsTable,
        eq(marketplaceOrdersTable.productId, marketplaceProductsTable.id),
      )
      .orderBy(desc(marketplaceOrdersTable.createdAt));
    res.json(orders);
  },
);

router.patch(
  "/platform-admin/marketplace/orders/:id",
  requireAuth,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "shipped", "fulfilled", "cancelled"];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: "Недопустимый статус" });
      return;
    }
    const [row] = await db
      .update(marketplaceOrdersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(marketplaceOrdersTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    res.json(row);
  },
);

export default router;
