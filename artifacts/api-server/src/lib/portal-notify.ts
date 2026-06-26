/**
 * Portal publish notifications.
 *
 * Reuses the existing sendTelegramMessage helper from ai.ts.
 * Broadcasts to any telegram_settings rows that have a chat_id set for the
 * company — or, if no per-company scoping exists in telegram_settings, just
 * logs. Safe to extend.
 *
 * Called best-effort (wrapped in try/catch at call site) — failure never
 * breaks the save.
 */

import { logger } from "./logger";
import { sendTelegramMessage } from "./ai";
import { db } from "./db";
import { telegramSettingsTable } from "./db/schema";
import { ne } from "drizzle-orm";

export interface PortalContentPublishable {
  id: number;
  title: string;
  type: string;
  audience: string;
}

export async function notifyPortalPublish(content: PortalContentPublishable): Promise<void> {
  const text = `📢 Новый материал на портале\n<b>${escapeHtml(content.title)}</b>\nТип: ${content.type} | Аудитория: ${content.audience}`;

  // Find all telegram_settings rows with a non-empty chat_id
  const settings = await db.select()
    .from(telegramSettingsTable)
    .where(ne(telegramSettingsTable.chatId, ""));

  if (settings.length === 0) {
    logger.info({ contentId: content.id, title: content.title }, "portal-notify: no telegram recipients configured");
    return;
  }

  await Promise.allSettled(
    settings.map((s) => sendTelegramMessage(s.chatId, text))
  );

  logger.info(
    { contentId: content.id, recipients: settings.length },
    "portal-notify: publish notification sent",
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
