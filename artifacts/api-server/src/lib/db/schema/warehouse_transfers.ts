import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Перемещение материалов между складами (шапка). */
export const warehouseTransfersTable = pgTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  status: text("status").notNull().default("draft"), // draft | in_transit | received | received_with_discrepancy | cancelled
  documentNumber: text("document_number"),
  sentBy: integer("sent_by"),
  receivedBy: integer("received_by"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Позиции перемещения: сколько отправлено и сколько фактически принято. */
export const warehouseTransferItemsTable = pgTable("warehouse_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantitySent: numeric("quantity_sent", { precision: 14, scale: 3 }).notNull().default("0"),
  quantityReceived: numeric("quantity_received", { precision: 14, scale: 3 }),
  notes: text("notes"),
});

export const insertWarehouseTransferSchema = createInsertSchema(warehouseTransfersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseTransferItemSchema = createInsertSchema(warehouseTransferItemsTable).omit({ id: true });

export type InsertWarehouseTransfer = z.infer<typeof insertWarehouseTransferSchema>;
export type WarehouseTransfer = typeof warehouseTransfersTable.$inferSelect;
export type InsertWarehouseTransferItem = z.infer<typeof insertWarehouseTransferItemSchema>;
export type WarehouseTransferItem = typeof warehouseTransferItemsTable.$inferSelect;
