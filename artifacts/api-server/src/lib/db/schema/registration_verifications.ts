import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const registrationVerificationsTable = pgTable("registration_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  tokenHash: text("token_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
