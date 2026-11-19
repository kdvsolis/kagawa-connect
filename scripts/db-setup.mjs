#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql to the KaGawa project.
 *
 * Prefers DATABASE_URL (direct Postgres). Falls back to Supabase Management
 * API when SUPABASE_ACCESS_TOKEN is set. Publishable keys cannot run DDL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const migrationsDir = join(root, "supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const sql = files
  .map((f) => `-- >>> ${f}\n` + readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n\n");

async function viaDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied migrations via DATABASE_URL");
    return true;
  } finally {
    await client.end();
  }
}

async function viaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref =
    process.env.SUPABASE_PROJECT_REF ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
      .replace(/^https?:\/\//, "")
      .split(".")[0];
  if (!token || !ref) return false;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body}`);
  }
  console.log("Applied migrations via Supabase Management API");
  return true;
}

async function main() {
  if (await viaDatabaseUrl()) return;
  if (await viaManagementApi()) return;

  console.error(`
Could not apply migrations automatically.

The publishable key can read/write rows, but creating tables needs one of:
  1) DATABASE_URL=postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
  2) SUPABASE_ACCESS_TOKEN=<personal access token from supabase.com/dashboard/account/tokens>

Or paste this file into the Supabase SQL Editor:
  supabase/migrations/20251023120000_kagawa.sql
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
