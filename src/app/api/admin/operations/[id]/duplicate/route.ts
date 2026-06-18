import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateCodigoOP } from "@/lib/codigos";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [original] = await db.select().from(operations).where(eq(operations.id, id)).limit(1);
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Auto-generate name: next OP number for same client, no entity
  let displayName = "Operación";
  if (original.client_id) {
    const [cli] = await db
      .select({ nombre: clients.nombre, nombre_comercial: clients.nombre_comercial })
      .from(clients)
      .where(eq(clients.id, original.client_id))
      .limit(1);
    if (cli) displayName = cli.nombre_comercial?.trim() || cli.nombre;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operations)
    .where(eq(operations.client_id, original.client_id!));
  const opNum = Number(count) + 1;
  const autoNombre = `${displayName} - OP ${opNum}`;

  const codigo = await generateCodigoOP(original.client_id);

  const [newOp] = await db.insert(operations).values({
    collaborator_id: original.collaborator_id,
    pipeline_key: original.pipeline_key,
    client_id: original.client_id,
    supplier_id: original.supplier_id,
    producto: original.producto,
    importe: original.importe,
    renting_rol: original.renting_rol,
    equipo_tipo: original.equipo_tipo,
    plazo_meses: original.plazo_meses,
    lugar_entrega: original.lugar_entrega,
    nombre: autoNombre,
    fase: "Pre-análisis",
    status: "activa",
    descripcion: original.descripcion,
    contacto_directo: original.contacto_directo,
    tiene_aval: original.tiene_aval,
    aval_tipo: original.aval_tipo,
    aval_nombre: original.aval_nombre,
    aval_email: original.aval_email,
    aval_telefono: original.aval_telefono,
    aval_persona_contacto: original.aval_persona_contacto,
    aval_dni: original.aval_dni,
    aval_empresa: original.aval_empresa,
    aval_contact_id: original.aval_contact_id,
    aval_client_id: original.aval_client_id,
    modalidad_renting: original.modalidad_renting,
    necesidad: original.necesidad,
    entidad_preferencia: original.entidad_preferencia,
    codigo,
  }).returning();

  return NextResponse.json(newOp);
}
