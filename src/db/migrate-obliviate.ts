/**
 * Migration: operations.obliviate_mov + gastos_fijos.empresa
 *
 * Run once: npx tsx --env-file=.env.local src/db/migrate-obliviate.ts
 *
 * Bearing está en Holded; Obliviate no. Los movimientos de Obliviate se marcan a
 * mano y entran en la caja consolidada.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("1) operations.obliviate_mov…");
  await sql`ALTER TABLE operations ADD COLUMN IF NOT EXISTS obliviate_mov jsonb DEFAULT '[]'::jsonb`;

  console.log("2) gastos_fijos.empresa (bearing / obliviate)…");
  await sql`ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS empresa text NOT NULL DEFAULT 'bearing'`;

  console.log("Done!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
