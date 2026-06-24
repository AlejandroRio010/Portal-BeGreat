import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators, contacts, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDocId } from "@/lib/format";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { id } = await params;

  // Verify the op belongs to this collaborator
  const [op] = await db
    .select({ id: operations.id, client_id: operations.client_id })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Check permission
  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const { producto, importe, descripcion, plazo_meses, lugar_entrega, equipo_tipo,
          es_renovacion, operacion_original_id, resultado, pipeline_key,
          necesidad, modalidad_renting,
          tiene_aval, aval_tipo, aval_nombre, aval_email, aval_telefono, aval_persona_contacto,
          aval_dni, aval_empresa, aval_contact_id, aval_client_id,
          aval_cif, aval_direccion, aval_cnae, aval_web,
          motivo_denegacion } = body;

  // Actualización parcial: solo tocamos lo que llega
  const data: Record<string, unknown> = { updated_at: new Date() };
  if (producto !== undefined) data.producto = producto || null;
  if (importe !== undefined) data.importe = importe || null;
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (plazo_meses !== undefined) data.plazo_meses = plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) data.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) data.equipo_tipo = equipo_tipo || null;
  if (necesidad !== undefined) data.necesidad = necesidad || null;
  if (modalidad_renting !== undefined) data.modalidad_renting = modalidad_renting || null;
  if (body.cuota_mensual !== undefined) data.cuota_mensual = body.cuota_mensual || null;
  if (body.fecha_contrato !== undefined) data.fecha_contrato = body.fecha_contrato ? new Date(body.fecha_contrato) : null;
  if (body.fecha_fin_contrato !== undefined) data.fecha_fin_contrato = body.fecha_fin_contrato ? new Date(body.fecha_fin_contrato) : null;
  if (body.created_at !== undefined) data.created_at = new Date(body.created_at);
  if (body.fecha_cierre !== undefined) data.fecha_cierre = body.fecha_cierre ? new Date(body.fecha_cierre) : null;
  if (typeof es_renovacion === "boolean") data.es_renovacion = es_renovacion;
  if (operacion_original_id !== undefined) data.operacion_original_id = operacion_original_id || null;
  if (typeof tiene_aval === "boolean") {
    data.tiene_aval = tiene_aval;
    data.aval_tipo = tiene_aval ? (aval_tipo || null) : null;
    data.aval_nombre = tiene_aval ? (aval_nombre || null) : null;
    data.aval_email = tiene_aval ? (aval_email || null) : null;
    data.aval_telefono = tiene_aval ? (aval_telefono || null) : null;
    data.aval_persona_contacto = tiene_aval ? (aval_persona_contacto || null) : null;
    data.aval_dni = tiene_aval && aval_tipo === "persona_fisica" ? (aval_dni ? formatDocId(aval_dni) : null) : null;
    data.aval_empresa = tiene_aval && aval_tipo === "persona_fisica" ? (aval_empresa || null) : null;
    // Auto-create contact if persona física avalista is new
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

    let resolvedClientId = aval_client_id || null;
    if (tiene_aval && aval_tipo === "empresa" && !aval_client_id && aval_nombre) {
      const [existing] = await db.select({ id: clients.id }).from(clients)
        .where(eq(clients.nombre, aval_nombre)).limit(1);
      if (existing) {
        resolvedClientId = existing.id;
      } else {
        const [newClient] = await db.insert(clients).values({
          nombre: aval_nombre,
          email: aval_email || null,
          telefono: aval_telefono || null,
          cif: aval_cif || null,
          direccion: aval_direccion || null,
          cnae: aval_cnae || null,
          web: aval_web || null,
          collaborator_id: userId,
        }).returning();
        resolvedClientId = newClient.id;
      }
    }
    data.aval_client_id = tiene_aval && aval_tipo === "empresa" ? resolvedClientId : null;
  }

  // Resultado: marca ganada/denegada/en curso y fija la fecha de cierre
  if (resultado === "ganada") {
    data.status = "activa";
    data.fase = pipeline_key === "renting" ? "Transferencia realizada" : "Honorarios pagados";
    data.fecha_cierre = new Date();
  } else if (resultado === "denegada") {
    data.status = "archivada";
    data.fecha_cierre = new Date();
    data.motivo_denegacion = motivo_denegacion || null;
  } else if (resultado === "en_curso") {
    data.status = "activa";
    data.fecha_cierre = null;
  }

  await db.update(operations).set(data).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
