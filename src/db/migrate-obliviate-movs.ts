/**
 * Migration: tabla obliviate_movs (movimientos del banco de Obliviate) +
 * saldo inicial de su cuenta a 31/12/2025 + siembra del extracto ene–jul 2026.
 *
 * Run once: npx tsx --env-file=.env.local src/db/migrate-obliviate-movs.ts [ruta-json]
 * El JSON es la salida parseada del extracto del Sabadell (fecha, concepto,
 * importe, saldo, categoria). Si no se pasa, solo crea la tabla.
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const sql = neon(process.env.DATABASE_URL!);

// Saldo de la cuenta de Obliviate (Sabadell ...5194) a 31/12/2025, deducido
// del extracto: primer movimiento de 2026 (05/01, −997,57) deja 32.619,32.
const SALDO_INICIAL_2026 = "33616.89";

async function migrate() {
  console.log("Creando tabla obliviate_movs…");
  await sql`CREATE TABLE IF NOT EXISTS obliviate_movs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha text NOT NULL,
    concepto text NOT NULL,
    importe numeric(12,2) NOT NULL,
    saldo numeric(12,2),
    categoria text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`;
  // Dedup de reimportaciones del extracto: mismo día + concepto + importe + saldo
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS obliviate_movs_dedup
    ON obliviate_movs (fecha, concepto, importe, coalesce(saldo, 0))`;

  console.log("Saldo inicial Obliviate 2026…");
  await sql`INSERT INTO finanzas_valores (clave, valor) VALUES ('saldo_inicial_obliviate_2026', ${SALDO_INICIAL_2026})
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now()`;

  const ruta = process.argv[2];
  if (ruta) {
    const movs: { fecha: string; concepto: string; importe: number; saldo: number; categoria: string }[] =
      JSON.parse(readFileSync(ruta, "utf8"));
    console.log(`Sembrando ${movs.length} movimientos…`);
    let nuevos = 0;
    for (const m of movs) {
      const r = await sql`INSERT INTO obliviate_movs (fecha, concepto, importe, saldo, categoria)
        VALUES (${m.fecha}, ${m.concepto}, ${String(m.importe)}, ${String(m.saldo)}, ${m.categoria})
        ON CONFLICT (fecha, concepto, importe, coalesce(saldo, 0)) DO NOTHING RETURNING id`;
      if (r.length) nuevos++;
    }
    console.log(`Insertados ${nuevos} (${movs.length - nuevos} ya existían).`);
  }
  const tot = await sql`SELECT count(*) AS n, sum(importe) AS flujo FROM obliviate_movs`;
  console.log(`Total en tabla: ${tot[0].n} movs, flujo ${tot[0].flujo}`);
  console.log("Done!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
