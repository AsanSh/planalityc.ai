import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync } from "fs";
import path from "path";
import { db, pool } from "./db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const migrationsFolder = [
    path.join(process.cwd(), "drizzle/migrations"),
    path.join(__dirname, "drizzle/migrations"),
  ].find((candidate) => existsSync(candidate));
  if (!migrationsFolder) {
    throw new Error("Drizzle migrations folder not found");
  }
  try {
    await migrate(db, { migrationsFolder });
    logger.info("DB migrations: OK");
  } catch (err) {
    logger.error({ err }, "DB migrations failed");
    throw err;
  } finally {
    // migrate() opens its own client — pool stays open for the app
  }
}
