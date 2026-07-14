import "dotenv/config";
import { Client } from "pg";
import { normalizePostgresUrl } from "./database-url.mjs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.log("connection=missing");
  process.exit(1);
}

const client = new Client({ connectionString: normalizePostgresUrl(connectionString) });

try {
  await client.connect();
  await client.query("select 1");
  console.log("connection=ok");

  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 and table_type = $2 order by table_name",
    ["public", "BASE TABLE"],
  );
  console.log(`tables=${tables.rows.map((row) => row.table_name).join(",")}`);

  const enums = await client.query(
    "select typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = $1 and t.typtype = $2 order by typname",
    ["public", "e"],
  );
  console.log(`enums=${enums.rows.map((row) => row.typname).join(",")}`);
} catch (error) {
  console.log(`connection=failed ${error?.code ?? "ERROR"}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
