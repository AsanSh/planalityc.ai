import type { Response } from "express";
import { captureException } from "./sentry";

/** Log full error server-side; return safe message to client. */
export function sendServerError(
  res: Response,
  err: unknown,
  fallback = "Внутренняя ошибка сервера",
): void {
  console.error(fallback, err);
  void captureException(err, { fallback });
  res.status(500).json({ error: fallback });
}
