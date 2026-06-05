import { eq } from "drizzle-orm";
import { db, moduleSettingsTable } from "../lib/db";
import {
  AVAILABLE_MODULES,
  DEFAULT_ENABLED_MODULE_KEYS,
  type SettingsModuleKey,
} from "../lib/module-registry";
import { type AuthenticatedRequest } from "./auth";
import type { NextFunction, Response } from "express";

const MODULE_CANONICAL_BY_KEY = new Map(
  AVAILABLE_MODULES.map((moduleDef) => [moduleDef.key, moduleDef.canonicalKey]),
);

function sameCanonicalModule(requested: SettingsModuleKey, enabled: string): boolean {
  const requestedCanonical = MODULE_CANONICAL_BY_KEY.get(requested);
  const enabledCanonical = MODULE_CANONICAL_BY_KEY.get(enabled as SettingsModuleKey);
  return !!requestedCanonical && requestedCanonical === enabledCanonical;
}

export async function isModuleEnabledForCompany(
  companyId: number,
  moduleKey: SettingsModuleKey,
): Promise<boolean> {
  const settings = await db
    .select()
    .from(moduleSettingsTable)
    .where(eq(moduleSettingsTable.companyId, companyId));

  const enabledKeys =
    settings.length === 0
      ? DEFAULT_ENABLED_MODULE_KEYS
      : settings.filter((row) => row.isEnabled).map((row) => row.moduleKey);

  return enabledKeys.some(
    (enabled) => enabled === moduleKey || sameCanonicalModule(moduleKey, enabled),
  );
}

export function requireEnabledModule(moduleKey: SettingsModuleKey) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const companyId = req.scopedCompanyId;
    if (companyId == null) {
      res.status(403).json({ error: "Компания не определена" });
      return;
    }

    const enabled = await isModuleEnabledForCompany(companyId, moduleKey);
    if (!enabled) {
      res.status(403).json({
        error: "Модуль не подключён",
        module: moduleKey,
      });
      return;
    }

    next();
  };
}
