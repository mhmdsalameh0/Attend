import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { normalizePostgresUrl } from "./database-url.mjs";

const migrationName = "20260713120000_attendance_schema";
const migrationPath = new URL(
  "../prisma/migrations/20260713120000_attendance_schema/migration.sql",
  import.meta.url,
);
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.log("connection=missing");
  process.exit(1);
}

const sql = await readFile(migrationPath, "utf8");
const checksum = createHash("sha256").update(sql).digest("hex");
const client = new Client({ connectionString: normalizePostgresUrl(connectionString) });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.query(
    `
      INSERT INTO "_prisma_migrations" (
        "id",
        "checksum",
        "finished_at",
        "migration_name",
        "logs",
        "rolled_back_at",
        "started_at",
        "applied_steps_count"
      )
      VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)
      ON CONFLICT ("id") DO NOTHING
    `,
    [randomUUID(), checksum, migrationName],
  );
  console.log("baseline=ok");
} catch (error) {
  console.log(`baseline=failed ${error?.code ?? "ERROR"}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
