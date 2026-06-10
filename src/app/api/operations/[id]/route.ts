import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { id } = await params;

  // Verify the op belongs to this collaborator
  const [op] = await db
    .select({ id: operations.id })
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
          tiene_aval, aval_tipo, aval_nombre, aval_email, aval_telefono, aval_persona_contacto } = body;

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
  if (typeof es_renovacion === "boolean") data.es_renovacion = es_renovacion;
  if (operacion_original_id !== undefined) data.operacion_original_id = operacion_original_id || null;
  if (typeof tiene_aval === "boolean") {
    data.tiene_aval = tiene_aval;
    data.aval_tipo = tiene_aval ? (aval_tipo || null) : null;
    data.aval_nombre = tiene_aval ? (aval_nombre || null) : null;
    data.aval_email = tiene_aval ? (aval_email || null) : null;
    data.aval_telefono = tiene_aval ? (aval_telefono || null) : null;
    data.aval_persona_contacto = tiene_aval ? (aval_persona_contacto || null) : null;
  }

  // Resultado: marca ganada/denegada/en curso y fija la fecha de cierre
  if (resultado === "ganada") {
    data.status = "activa";
    data.fase = pipeline_key === "renting" ? "Transferencia realizada" : "Honorarios pagados";
    data.fecha_cierre = new Date();
  } else if (resultado === "denegada") {
    data.status = "archivada";
    data.fecha_cierre = new Date();
  } else if (resultado === "en_curso") {
    data.status = "activa";
    data.fecha_cierre = null;
  }

  await db.update(operations).set(data).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
