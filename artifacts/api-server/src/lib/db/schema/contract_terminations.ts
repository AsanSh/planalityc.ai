import { pgTable, serial, integer, text, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractTerminationsTable = pgTable("contract_terminations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  contractType: text("contract_type").notNull(), // 'sales' | 'lease'
  contractId: integer("contract_id").notNull(),
  terminationDate: date("termination_date"), // дата расторжения; используется для endDate и отсечки начислений
  reason: text("reason"),
  basis: text("basis"), // 'agreement' | 'unilateral'
  status: text("status").notNull().default("initiated"), // initiated -> approved -> settled -> closed
  financials: jsonb("financials").notNull().default({}), // { paid, debt, penalty, depositReturn, refund }
  note: text("note"),
  createdBy: integer("created_by"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractTerminationSchema = createInsertSchema(contractTerminationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContractTermination = z.infer<typeof insertContractTerminationSchema>;
export type ContractTermination = typeof contractTerminationsTable.$inferSelect;
