import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVAILABLE_MODULES,
  DEFAULT_ENABLED_MODULE_KEYS,
  MODULE_INTEGRATIONS,
  SIGNUP_MODULE_TO_SETTINGS_KEYS,
} from "./module-registry";

describe("api module-registry", () => {
  it("keeps signup business modules mapped to persisted settings keys", () => {
    assert.deepEqual(SIGNUP_MODULE_TO_SETTINGS_KEYS.construction, ["construction", "sales", "reports"]);
    assert.deepEqual(SIGNUP_MODULE_TO_SETTINGS_KEYS.rental, ["rental", "reports"]);
    assert.deepEqual(SIGNUP_MODULE_TO_SETTINGS_KEYS.warehouse, ["warehouse"]);
    assert.deepEqual(SIGNUP_MODULE_TO_SETTINGS_KEYS.crm, ["crm", "notifications"]);
  });

  it("exposes available settings modules with canonical ownership", () => {
    const byKey = new Map(AVAILABLE_MODULES.map((moduleDef) => [moduleDef.key, moduleDef]));

    assert.equal(byKey.get("construction")?.canonicalKey, "construction");
    assert.equal(byKey.get("warehouse")?.canonicalKey, "procurement");
    assert.equal(byKey.get("crm")?.canonicalKey, "crm");
    assert.equal(byKey.get("reports")?.canonicalKey, "finance");
  });

  it("documents the current default all-modules fallback", () => {
    assert.deepEqual(DEFAULT_ENABLED_MODULE_KEYS, [
      "construction",
      "sales",
      "rental",
      "warehouse",
      "crm",
      "reports",
    ]);
  });

  it("declares cross-module integration contracts", () => {
    const keys = MODULE_INTEGRATIONS.map((integration) => integration.key);
    assert.ok(keys.includes("construction.procurement"));
    assert.ok(keys.includes("construction.finance"));
    assert.ok(keys.includes("crm.construction"));
  });
});
