import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, moduleSettingsTable } from "../lib/db";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";
import {
  AVAILABLE_MODULES,
  DEFAULT_ENABLED_MODULE_KEYS,
  SIGNUP_MODULE_TO_SETTINGS_KEYS,
  type BusinessModuleKey,
} from "../lib/module-registry";

const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

const configureModulesSchema = z.object({
  modules: z.array(z.enum(["construction", "finance", "rental", "warehouse", "crm"])).min(1),
});

// GET /modules — список модулей с состоянием для компании
router.get("/modules", async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.scopedCompanyId!;
  if (!cid) { res.json(AVAILABLE_MODULES.map(m => ({ ...m, isEnabled: false }))); return; }

  const settings = await db.select().from(moduleSettingsTable).where(eq(moduleSettingsTable.companyId, cid));
  const settingsMap = new Map(settings.map(s => [s.moduleKey, s]));

  const result = AVAILABLE_MODULES.map(m => {
    const s = settingsMap.get(m.key);
    return {
      ...m,
      isEnabled: s?.isEnabled ?? m.key === "rental",
      enabledAt: s?.enabledAt ?? null,
      settingId: s?.id ?? null,
    };
  });

  res.json(result);
});

// POST /modules/:key/toggle — включить/выключить модуль
router.post("/modules/:key/toggle", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const key = req.params.key as string;
  const cid = req.scopedCompanyId!;
  if (!cid) { res.status(400).json({ error: "Нет привязки к организации" }); return; }

  const module = AVAILABLE_MODULES.find(m => m.key === key);
  if (!module) { res.status(404).json({ error: "Модуль не найден" }); return; }

  const [existing] = await db.select().from(moduleSettingsTable)
    .where(and(eq(moduleSettingsTable.companyId, cid), eq(moduleSettingsTable.moduleKey, key)));

  let result;
  if (existing) {
    const newEnabled = !existing.isEnabled;
    [result] = await db.update(moduleSettingsTable)
      .set({ isEnabled: newEnabled, enabledAt: newEnabled ? new Date() : null })
      .where(eq(moduleSettingsTable.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(moduleSettingsTable).values({
      companyId: cid,
      moduleKey: key,
      isEnabled: true,
      enabledAt: new Date(),
    }).returning();
  }

  res.json({ ...result, module });
});

// POST /modules/configure — задать набор бизнес-модулей компании
router.post("/modules/configure", requireRole("admin", "company_admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = configureModulesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Выберите минимум один модуль" });
    return;
  }

  const cid = req.scopedCompanyId!;
  if (!cid) { res.status(400).json({ error: "Нет привязки к организации" }); return; }

  const enabled = new Set<string>();
  for (const key of parsed.data.modules) {
    for (const mapped of SIGNUP_MODULE_TO_SETTINGS_KEYS[key as BusinessModuleKey] ?? []) enabled.add(mapped);
  }

  const availableKeys = AVAILABLE_MODULES.map((m) => m.key);
  for (const key of availableKeys) {
    const shouldEnable = enabled.has(key);
    const [existing] = await db.select().from(moduleSettingsTable)
      .where(and(eq(moduleSettingsTable.companyId, cid), eq(moduleSettingsTable.moduleKey, key)));

    if (existing) {
      await db.update(moduleSettingsTable)
        .set({ isEnabled: shouldEnable, enabledAt: shouldEnable ? new Date() : null })
        .where(eq(moduleSettingsTable.id, existing.id));
    } else {
      await db.insert(moduleSettingsTable).values({
        companyId: cid,
        moduleKey: key,
        isEnabled: shouldEnable,
        enabledAt: shouldEnable ? new Date() : null,
      });
    }
  }

  res.json({ modules: [...enabled] });
});

// GET /modules/enabled — список включённых ключей модулей
router.get("/modules/enabled", async (req: AuthenticatedRequest, res): Promise<void> => {
  const cid = req.scopedCompanyId!;
  if (!cid) { res.json(["rental"]); return; }

  const settings = await db.select().from(moduleSettingsTable)
    .where(and(eq(moduleSettingsTable.companyId, cid), eq(moduleSettingsTable.isEnabled, true)));

  const enabledKeys = settings.map(s => s.moduleKey);
  if (enabledKeys.length === 0) {
    res.json(DEFAULT_ENABLED_MODULE_KEYS);
    return;
  }

  res.json(enabledKeys);
});

export default router;
