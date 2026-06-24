import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, pool } from "./db";
import { logger } from "./logger";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "drizzle/migrations"),
    path.join(process.cwd(), "artifacts/api-server/drizzle/migrations"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle/migrations"),
  ];
  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta/_journal.json"))) return folder;
  }
  throw new Error(
    `Drizzle migrations not found (cwd=${process.cwd()})`,
  );
}

export async function runMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  try {
    await migrate(db, { migrationsFolder });
    logger.info("DB migrations: OK");
  } catch (err) {
    logger.error({ err }, "DB migrations failed");
    throw err;
  } finally {
    // migrate() opens its own client — pool stays open for the app
  }

  // Self-heal: idempotent CREATE ... IF NOT EXISTS migrations are re-applied
  // directly, so a hand-authored journal/ordering quirk can't leave a newer
  // table missing (e.g. 0036_portal_content). Safe to run every cold start.
  const selfHeal = ["0036_portal_content.sql"];
  for (const file of selfHeal) {
    const sqlPath = path.join(migrationsFolder, file);
    if (!existsSync(sqlPath)) continue;
    try {
      await pool.query(readFileSync(sqlPath, "utf8"));
      logger.info({ file }, "DB self-heal migration applied");
    } catch (err) {
      logger.error({ err, file }, "DB self-heal migration failed");
    }
  }
}
