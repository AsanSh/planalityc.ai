/** Production frontend for Planalityc.ai (отдельный Vercel project, не Proptech). */
export const DEFAULT_FRONTEND_URL = "https://planalitycai.vercel.app";

export function getFrontendBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    DEFAULT_FRONTEND_URL;
  return raw.replace(/\/+$/, "");
}
