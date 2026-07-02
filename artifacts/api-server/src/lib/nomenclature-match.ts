/**
 * Чистое сопоставление свободного названия материала с каноническим товаром
 * единого каталога (S0). Приоритет: точное имя → синоним.
 */

export interface GlobalProductRef {
  id: number;
  canonicalName: string;
  slug: string;
}

export interface AliasRef {
  globalProductId: number;
  alias: string;
}

/** Нормализация: trim, нижний регистр, схлопнуть внутренние пробелы. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Вернуть globalProductId для свободного названия или null.
 * Сопоставление регистронезависимое и устойчивое к лишним пробелам.
 */
export function matchGlobalProductId(
  name: string,
  products: GlobalProductRef[],
  aliases: AliasRef[],
): number | null {
  const n = normalizeName(name);
  if (!n) return null;
  const direct = products.find((p) => normalizeName(p.canonicalName) === n);
  if (direct) return direct.id;
  const alias = aliases.find((a) => normalizeName(a.alias) === n);
  return alias ? alias.globalProductId : null;
}
