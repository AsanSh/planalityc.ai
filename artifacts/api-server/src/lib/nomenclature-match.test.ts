import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchGlobalProductId,
  normalizeName,
  type GlobalProductRef,
  type AliasRef,
} from "./nomenclature-match";

const products: GlobalProductRef[] = [
  { id: 1, canonicalName: "Цемент М500", slug: "cement-m500" },
  { id: 2, canonicalName: "Песок речной", slug: "pesok-rechnoy" },
];
const aliases: AliasRef[] = [{ globalProductId: 1, alias: "Портландцемент М500" }];

test("нормализация: регистр и лишние пробелы", () => {
  assert.equal(normalizeName("  Цемент   М500 "), "цемент м500");
});

test("точное совпадение по canonicalName (без учёта регистра/пробелов)", () => {
  assert.equal(matchGlobalProductId("цемент м500", products, aliases), 1);
});

test("совпадение по синониму", () => {
  assert.equal(matchGlobalProductId("Портландцемент М500", products, aliases), 1);
});

test("нет совпадения → null", () => {
  assert.equal(matchGlobalProductId("Арматура А500", products, aliases), null);
});

test("пустое имя → null", () => {
  assert.equal(matchGlobalProductId("   ", products, aliases), null);
});
