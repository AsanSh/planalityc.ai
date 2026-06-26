import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const portalAccessTable = pgTable("portal_access", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  counterpartyId: integer("counterparty_id").notNull(),
  portalKind: text("portal_kind").notNull(),     // buyer/tenant/investor/contractor/supplier
  accessCode: text("access_code"),               // token/code already used client-side
  isActive: boolean("is_active").notNull().default(true),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PortalAccess = typeof portalAccessTable.$inferSelect;
export type InsertPortalAccess = typeof portalAccessTable.$inferInsert;
