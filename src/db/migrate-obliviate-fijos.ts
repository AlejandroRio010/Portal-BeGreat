/**
 * Migration: gastos_fijos.periodicidad + mes_cobro, y siembra de los gastos
 * fijos de OBLIVIATE (manuales, no están en Holded).
 *
 * Run once: npx tsx --env-file=.env.local src/db/migrate-obliviate-fijos.ts
 *
 * IONOS: una sola factura mensual (hosting 13,5+IVA = 16,335). En el mes de
 * renovación de cada dominio se suma su importe anual. Por eso el hosting es
 * mensual y cada dominio es anual con su mes_cobro.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Columnas periodicidad / mes_cobro…");
  await sql`ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS periodicidad text NOT NULL DEFAULT 'mensual'`;
  await sql`ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS mes_cobro integer`;

  // [label, match, mensual(importe con IVA), categoria, periodicidad, mes_cobro, nota]
  const seed: [string, string, number, string, string, number | null, string | null][] = [
    ["IONOS — hosting", "ionos-hosting", 16.335, "Software y suscripciones", "mensual", null, "13,50 € + IVA · factura mensual única"],
    ["Dominio BGC.ES", "dominio-bgc", 12.10, "Software y suscripciones", "anual", 7, "Renovación julio"],
    ["Dominio Obliv.es", "dominio-obliv", 12.10, "Software y suscripciones", "anual", 3, "Renovación marzo"],
    ["Dominio Ryuvim.com/es", "dominio-ryuvim", 24.20, "Software y suscripciones", "anual", 3, "Renovación marzo"],
    ["Gestoría (Obliviate)", "gestoria-obliviate", 96.80, "Servicios profesionales", "mensual", null, "80 € + IVA"],
    ["Teléfono (Obliviate)", "telefono-obliviate", 9.68, "Telecomunicaciones", "mensual", null, "8 € + IVA"],
  ];

  let n = 0;
  for (const [label, match, mensual, categoria, periodicidad, mes, nota] of seed) {
    const exists = await sql`SELECT 1 FROM gastos_fijos WHERE proveedor_match = ${match} AND empresa = 'obliviate' LIMIT 1`;
    if (exists.length) { console.log(`   · ${label} ya existe`); continue; }
    await sql`
      INSERT INTO gastos_fijos (label, proveedor_match, mensual, categoria, nota, empresa, periodicidad, mes_cobro)
      VALUES (${label}, ${match}, ${mensual}, ${categoria}, ${nota}, 'obliviate', ${periodicidad}, ${mes})
    `;
    n++;
    console.log(`   · Alta ${label}`);
  }

  console.log(`Sembrados ${n} fijos de Obliviate.`);
  const tot = await sql`SELECT count(*)::int AS n FROM gastos_fijos WHERE empresa = 'obliviate'`;
  console.log(`Total Obliviate: ${tot[0].n}`);
  console.log("Done!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
