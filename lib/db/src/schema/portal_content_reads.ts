import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const portalContentReadsTable = pgTable("portal_content_reads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  contentId: integer("content_id").notNull(),
  viewerUserId: integer("viewer_user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqRead: unique("portal_content_reads_content_viewer_uniq").on(t.contentId, t.viewerUserId),
}));

export type PortalContentRead = typeof portalContentReadsTable.$inferSelect;
