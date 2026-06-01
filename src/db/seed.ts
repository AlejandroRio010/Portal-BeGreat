import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding...");

  // Admin
  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(schema.collaborators).values({
    nombre: "Alejandro del Río",
    email: "alejandro.rio@begreatconsulting.es",
    password_hash: adminHash,
    identificador: "ADMIN-001",
    role: "admin",
  }).onConflictDoNothing();

  // Two test collaborators
  const collab1Hash = await bcrypt.hash("collab123", 10);
  const collab2Hash = await bcrypt.hash("collab456", 10);

  const [c1] = await db.insert(schema.collaborators).values({
    nombre: "Carlos Martínez",
    email: "carlos@despachotest.es",
    password_hash: collab1Hash,
    identificador: "COL-001",
    role: "colaborador",
  }).returning().onConflictDoNothing();

  const [c2] = await db.insert(schema.collaborators).values({
    nombre: "Laura García",
    email: "laura@partnertest.es",
    password_hash: collab2Hash,
    identificador: "COL-002",
    role: "colaborador",
  }).returning().onConflictDoNothing();

  // Pipelines
  await db.insert(schema.pipelines).values([
    {
      key: "consultoria",
      label: "Consultoría financiera",
      fases: ["Pre-analysis", "Fee Signature", "Under Entity Review", "Operation Approved", "Contract Signed", "Fees Paid"],
    },
    {
      key: "renting",
      label: "Renting",
      fases: ["Pre-analysis", "Under Entity Review", "Operation Approved", "Terms Accepted", "Contract Signed", "Transfered Made"],
    },
  ]).onConflictDoNothing();

  if (c1 && c2) {
    // Client for c1
    const [client1] = await db.insert(schema.clients).values({
      collaborator_id: c1.id,
      nombre: "Empresa Ejemplo S.L.",
      cif: "B12345678",
      email: "contacto@empresa-ejemplo.es",
      telefono: "910000001",
    }).returning();

    // Operation for c1
    await db.insert(schema.operations).values({
      collaborator_id: c1.id,
      pipeline_key: "consultoria",
      client_id: client1.id,
      producto: "Financiación circulante",
      importe: "150000",
      fase: "Pre-analysis",
      status: "activa",
      comision_colaborador: "3000",
      comision_begreat: "5000",
    });

    // Client for c2 — completely isolated
    const [client2] = await db.insert(schema.clients).values({
      collaborator_id: c2.id,
      nombre: "Tech Solutions S.A.",
      cif: "A87654321",
      email: "info@techsolutions.es",
      telefono: "910000002",
    }).returning();

    await db.insert(schema.operations).values({
      collaborator_id: c2.id,
      pipeline_key: "renting",
      client_id: client2.id,
      producto: "Renting equipos informáticos",
      importe: "45000",
      fase: "Under Entity Review",
      status: "activa",
      lugar_entrega: "Madrid, Calle Mayor 10",
    });
  }

  console.log("Seed complete.");
}

seed().catch(console.error);
