/**
 * Migration: collaborators.es_autonomo + marcar autónomos actuales.
 *
 * Run once: npx tsx --env-file=.env.local src/db/migrate-colab-autonomo.ts
 *
 * Autónomo = sus facturas llevan IVA 21% y retención IRPF 7%. Se guarda en el
 * colaborador para el motor de comisiones/pagos y el futuro cálculo de impuestos.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Columna collaborators.es_autonomo…");
  await sql`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS es_autonomo boolean NOT NULL DEFAULT false`;

  console.log("Marcando autónomos (Pablo, Alejandro)…");
  const upd = await sql`
    UPDATE collaborators SET es_autonomo = true
    WHERE nombre ILIKE 'pablo%' OR nombre ILIKE 'alejandro%'
    RETURNING nombre, role
  `;
  for (const r of upd) console.log(`   · autónomo: ${r.nombre} [${r.role}]`);

  console.log("Done!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
