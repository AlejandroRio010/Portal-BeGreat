import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const fe = await sql`SELECT id, nombre, tipo FROM financial_entities WHERE nombre ILIKE '%tendit%'`;
console.log("financial_entities Tendit:", JSON.stringify(fe));
for (const e of fe) {
  const offs = await sql`SELECT id, nombre FROM entity_offices WHERE entity_id=${e.id}`;
  console.log(`  ${e.nombre}: ${offs.length} oficinas`);
}
