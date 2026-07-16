/**
 * Migration: create gastos_fijos table + seed the existing hardcoded list.
 *
 * Run once with: npx tsx --env-file=.env.local src/db/migrate-gastos-fijos.ts
 *
 * Después la lista se gestiona desde el portal (Finanzas → Gastos fijos),
 * así que ya no hace falta tocar código para añadir/quitar un gasto fijo.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Creando tabla gastos_fijos...");
  await sql`
    CREATE TABLE IF NOT EXISTS gastos_fijos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      label TEXT NOT NULL,
      proveedor_match TEXT NOT NULL,
      holded_contact_id TEXT,
      mensual NUMERIC(10,2),
      categoria TEXT,
      nota TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `;

  // Semilla: los gastos fijos que hasta ahora estaban en código.
  const seed: [string, string, number | null, string, string | null][] = [
    ["Alphabet — renting coche", "alphabet", 1192.64, "Vehículos (renting)", null],
    ["Expelliarmus Services", "expelliarmus", 133.10, "Otros gastos", null],
    ["Telefónica", "telefonica", null, "Telecomunicaciones", "Telecom + iPhone"],
    ["Microsoft", "microsoft", 28.31, "Software y suscripciones", null],
    ["Holded — software", "holded", null, "Software y suscripciones", "Importe variable"],
  ];

  let insertados = 0;
  for (const [label, match, mensual, categoria, nota] of seed) {
    const exists = await sql`SELECT 1 FROM gastos_fijos WHERE proveedor_match = ${match} LIMIT 1`;
    if (exists.length) continue;
    await sql`
      INSERT INTO gastos_fijos (label, proveedor_match, mensual, categoria, nota)
      VALUES (${label}, ${match}, ${mensual}, ${categoria}, ${nota})
    `;
    insertados++;
  }
  console.log(`Semilla insertada: ${insertados} gastos fijos.`);

  const total = await sql`SELECT count(*)::int AS n FROM gastos_fijos`;
  console.log(`Total en gastos_fijos: ${total[0].n}`);
  console.log("Done!");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
