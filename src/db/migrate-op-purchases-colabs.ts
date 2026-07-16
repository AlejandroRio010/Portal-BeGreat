/**
 * Migration:
 *  1) operations.holded_purchases jsonb (facturas de compra vinculadas a la op).
 *  2) Alta de colaboradores que faltan: Fosterman, Krattos, Human & Brave.
 *
 * Run once: npx tsx --env-file=.env.local src/db/migrate-op-purchases-colabs.ts
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("1) Columna operations.holded_purchases…");
  await sql`ALTER TABLE operations ADD COLUMN IF NOT EXISTS holded_purchases jsonb DEFAULT '[]'::jsonb`;

  console.log("2) Alta de colaboradores que faltan…");
  const nuevos = ["Fosterman", "Krattos", "Human & Brave"];
  const [{ max }] = await sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) AS max
    FROM collaborators WHERE codigo LIKE 'COL-%'
  `;
  let n = Number(max);
  for (const nombre of nuevos) {
    const exists = await sql`SELECT 1 FROM collaborators WHERE lower(nombre) = lower(${nombre}) LIMIT 1`;
    if (exists.length) { console.log(`   · ${nombre} ya existe, salto`); continue; }
    n++;
    const codigo = `COL-${String(n).padStart(3, "0")}`;
    const email = `${codigo.toLowerCase()}@sin-acceso.begreat`;
    await sql`
      INSERT INTO collaborators (nombre, email, password_hash, role, identificador, codigo, activo, razon_social)
      VALUES (${nombre}, ${email}, 'sin-acceso', 'colaborador', ${codigo}, ${codigo}, true, ${nombre})
    `;
    console.log(`   · Alta ${nombre} (${codigo})`);
  }

  const total = await sql`SELECT count(*)::int AS n FROM collaborators WHERE role = 'colaborador'`;
  console.log(`Colaboradores totales: ${total[0].n}`);
  console.log("Done!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
