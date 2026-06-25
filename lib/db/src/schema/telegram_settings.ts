import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const telegramSettingsTable = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  chatId: text("chat_id").notNull().default(""),
  notifications: jsonb("notifications").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TelegramSettings = typeof telegramSettingsTable.$inferSelect;
