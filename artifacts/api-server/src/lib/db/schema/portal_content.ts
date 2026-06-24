import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalContentTable = pgTable("portal_content", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  type: text("type").notNull().default("news"),         // news/announcement/poll/promotion/closed_sale/broadcast/service/club_task/construction_update/property_catalog
  status: text("status").notNull().default("draft"),    // draft/published/archived
  audience: text("audience").notNull().default("all"),  // all/buyers/tenants/investors/contractors/suppliers
  placement: text("placement").default("home"),         // home/my_home/services/club/catalog/documents
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  projectName: text("project_name"),
  imageUrl: text("image_url"),
  priceLabel: text("price_label"),
  rewardPoints: integer("reward_points"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  pollOptions: jsonb("poll_options"),                   // string[]
  pinned: boolean("pinned").notNull().default(false),
  publishAt: timestamp("publish_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPortalContentSchema = createInsertSchema(portalContentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortalContent = z.infer<typeof insertPortalContentSchema>;
export type PortalContent = typeof portalContentTable.$inferSelect;
