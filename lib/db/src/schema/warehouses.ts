import { pgTable, serial, integer, text, timestamp, numeric, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Склад компании: центральный, объектный (проектный), прорабский или транзитный. */
export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("central"), // central | project | foreman | transit
  projectId: integer("project_id"), // для project/foreman складов
  responsibleUserId: integer("responsible_user_id"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/** Остаток и резерв по паре (склад, позиция номенклатуры). */
export const warehouseStockTable = pgTable("warehouse_stock", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  reservedQuantity: numeric("reserved_quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  avgPrice: numeric("avg_price", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  uniqWarehouseItem: unique("warehouse_stock_warehouse_item_uniq").on(t.warehouseId, t.itemId),
}));

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseStockSchema = createInsertSchema(warehouseStockTable).omit({ id: true, updatedAt: true });

export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;
export type InsertWarehouseStock = z.infer<typeof insertWarehouseStockSchema>;
export type WarehouseStock = typeof warehouseStockTable.$inferSelect;
