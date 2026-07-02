import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Заявка на изменение спецификаций помещения (площадь, мокрые точки, двери и пр.).
 * Создаёт продажник/руководитель проекта из шахматки, ПТО принимает в работу или отклоняет.
 * Строки не удаляются — таблица служит историей изменений по помещению.
 */
export const constructionUnitChangeRequestsTable = pgTable("construction_unit_change_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  projectId: integer("project_id"),
  unitId: integer("unit_id").notNull(),
  // area | wet_points | doors | layout | other
  specType: text("spec_type").notNull().default("area"),
  currentValue: text("current_value"),
  requestedValue: text("requested_value").notNull(),
  comment: text("comment"),
  // Приложенный файл для ПТО: JSON { fileName, mimeType, base64 }
  documentMeta: text("document_meta"),
  // pending | in_progress | rejected | done
  status: text("status").notNull().default("pending"),
  requestedBy: integer("requested_by"),
  requestedByName: text("requested_by_name"),
  requesterRole: text("requester_role"),
  reviewedBy: integer("reviewed_by"),
  reviewedByName: text("reviewed_by_name"),
  reviewComment: text("review_comment"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructionUnitChangeRequestSchema = createInsertSchema(constructionUnitChangeRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConstructionUnitChangeRequest = z.infer<typeof insertConstructionUnitChangeRequestSchema>;
export type ConstructionUnitChangeRequest = typeof constructionUnitChangeRequestsTable.$inferSelect;
