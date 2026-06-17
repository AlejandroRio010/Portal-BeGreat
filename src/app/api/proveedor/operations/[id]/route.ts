import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, contacts, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const { id } = await params;

  // Verify the op belongs to this supplier
  const [op] = await db
    .select({ id: operations.id, client_id: operations.client_id, collaborator_id: operations.collaborator_id })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.supplier_id, supplierId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json();
  const { importe, descripcion, plazo_meses, lugar_entrega, equipo_tipo,
          resultado, pipeline_key, motivo_denegacion,
          tiene_aval, aval_tipo, aval_nombre, aval_email, aval_telefono, aval_persona_contacto,
          aval_dni, aval_empresa, aval_contact_id, aval_client_id } = body;

  const data: Record<string, unknown> = { updated_at: new Date() };

  // Resultado handling (ganada/denegada/en_curso)
  if (resultado) {
    const pk = pipeline_key ?? "renting";
    if (resultado === "ganada") {
      data.fase = "Transferencia realizada";
      data.status = "archivada";
      data.fecha_cierre = new Date();
    } else if (resultado === "denegada") {
      data.status = "archivada";
      data.motivo_denegacion = motivo_denegacion || null;
      data.fecha_cierre = new Date();
    } else if (resultado === "en_curso") {
      data.status = "activa";
      data.motivo_denegacion = null;
      data.fecha_cierre = null;
    }
  }

  // Limited editable fields for proveedor
  if (importe !== undefined) data.importe = importe || null;
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (plazo_meses !== undefined) data.plazo_meses = plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) data.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) data.equipo_tipo = equipo_tipo || null;

  if (typeof tiene_aval === "boolean") {
    data.tiene_aval = tiene_aval;
    data.aval_tipo = tiene_aval ? (aval_tipo || null) : null;
    data.aval_nombre = tiene_aval ? (aval_nombre || null) : null;
    data.aval_email = tiene_aval ? (aval_email || null) : null;
    data.aval_telefono = tiene_aval ? (aval_telefono || null) : null;
    data.aval_persona_contacto = tiene_aval ? (aval_persona_contacto || null) : null;
    data.aval_dni = tiene_aval && aval_tipo === "persona_fisica" ? (aval_dni || null) : null;
    data.aval_empresa = tiene_aval && aval_tipo === "persona_fisica" ? (aval_empresa || null) : null;

    let resolvedContactId = aval_contact_id || null;
    if (tiene_aval && aval_tipo === "persona_fisica" && !aval_contact_id && aval_nombre && op.client_id) {
      const [existing] = await db.select({ id: contacts.id }).from(contacts)
        .where(and(eq(contacts.client_id, op.client_id), eq(contacts.nombre, aval_nombre))).limit(1);
      if (existing) {
        resolvedContactId = existing.id;
      } else {
        const [newContact] = await db.insert(contacts).values({
          client_id: op.client_id,
          nombre: aval_nombre,
          email: aval_email || null,
          telefono: aval_telefono || null,
          rol: aval_persona_contacto || null,
        }).returning();
        resolvedContactId = newContact.id;
      }
    }
    data.aval_contact_id = tiene_aval && aval_tipo === "persona_fisica" ? resolvedContactId : null;

    let resolvedAvalClientId = aval_client_id || null;
    if (tiene_aval && aval_tipo === "empresa" && !aval_client_id && aval_nombre) {
      const [existing] = await db.select({ id: clients.id }).from(clients)
        .where(eq(clients.nombre, aval_nombre)).limit(1);
      if (existing) {
        resolvedAvalClientId = existing.id;
      } else {
        const [newClient] = await db.insert(clients).values({
          nombre: aval_nombre,
          email: aval_email || null,
          telefono: aval_telefono || null,
          collaborator_id: op.collaborator_id,
        }).returning();
        resolvedAvalClientId = newClient.id;
      }
    }
    data.aval_client_id = tiene_aval && aval_tipo === "empresa" ? resolvedAvalClientId : null;
  }

  await db.update(operations).set(data).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
