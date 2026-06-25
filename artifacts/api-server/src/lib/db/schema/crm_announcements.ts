import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const crmAnnouncementsTable = pgTable("crm_announcements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  title: text("title").notNull(),
  segment: text("segment").notNull().default(""),
  channel: text("channel").notNull().default("Портал"),
  status: text("status").notNull().default("Черновик"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CrmAnnouncement = typeof crmAnnouncementsTable.$inferSelect;
