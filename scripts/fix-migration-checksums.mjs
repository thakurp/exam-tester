/**
 * One-off script: updates _prisma_migrations checksums to match our stub files.
 * Run: node scripts/fix-migration-checksums.mjs
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import pkg from "pg";
import { config } from "dotenv";

const { Client } = pkg;
config({ path: ".env.local" });

const migrations = [
  "20260422085815_add_subject_state",
  "20260422101651_add_diagram_svg",
  "20260422120358_add_diagram_classification",
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const name of migrations) {
  const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const result = await client.query(
    'UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2 RETURNING migration_name',
    [checksum, name]
  );
  if (result.rowCount > 0) {
    console.log(`Updated ${name}`);
  } else {
    console.warn(`No row found for ${name}`);
  }
}

await client.end();
console.log("Done.");
