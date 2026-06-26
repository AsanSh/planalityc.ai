import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  name: text("name").notNull(),
  /** Nullable for generated documents that have no real file (use payload instead). */
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by"),
  /**
   * Document type discriminator: "invoice" | "tax_invoice" | "act" | "reconciliation" | ...
   * Free-text string kept consistent by convention.
   */
  docType: text("doc_type"),
  /** Structured JSON payload for generated docs (tax invoices, invoices, etc.). */
  payload: text("payload"),
  /** Lifecycle status for generated docs: "draft" | "final". Defaults to "draft". */
  docStatus: text("doc_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
