let _token: string | null = null;

const PROD_API = "https://planalityc-api.vercel.app";
const DEV_API = "http://localhost:3000";

export const setToken = (t: string | null): void => {
  _token = t;
};

export const getToken = (): string | null => _token;

/** Базовый URL API (с /api на Vercel), как в artifacts/proptech/src/lib/api-base.ts */
export function getApiBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  let base = raw || (__DEV__ ? DEV_API : PROD_API);
  base = base.replace(/\/+$/, "");
  if (!base) base = PROD_API;

  try {
    const u = new URL(base);
    const pathRaw = u.pathname || "/";
    const path = pathRaw.replace(/\/+$/, "") || "/";
    if (u.hostname.endsWith("vercel.app") && path === "/") {
      return `${u.origin}/api`.replace(/\/+$/, "");
    }
  } catch {
    /* относительный URL */
  }

  return base;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBase()}${normalizedPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const msg =
      (typeof body.error === "string" && body.error) ||
      (typeof body.message === "string" && body.message) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "0 сом";
  return (
    new Intl.NumberFormat("ru-KG", {
      style: "decimal",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(num) + " сом"
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
