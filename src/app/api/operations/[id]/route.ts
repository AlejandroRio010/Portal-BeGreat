import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sanitizeNumeric } from "@/lib/format";
import { resolveAvalistas, legacyAvalFields, type AvalistaInput } from "@/lib/avalistas";

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
  if (importe !== undefined) data.importe = sanitizeNumeric(importe);
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (plazo_meses !== undefined) data.plazo_meses = plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) data.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) data.equipo_tipo = equipo_tipo || null;
  if (necesidad !== undefined) data.necesidad = necesidad || null;
  if (modalidad_renting !== undefined) data.modalidad_renting = modalidad_renting || null;
  if (body.cuota_mensual !== undefined) data.cuota_mensual = sanitizeNumeric(body.cuota_mensual);
  if (body.cuota_aproximada_min !== undefined) data.cuota_aproximada_min = sanitizeNumeric(body.cuota_aproximada_min);
  if (body.cuota_aproximada_max !== undefined) data.cuota_aproximada_max = sanitizeNumeric(body.cuota_aproximada_max);
  if (body.cuota_definitiva !== undefined) data.cuota_definitiva = sanitizeNumeric(body.cuota_definitiva);
  if (body.fecha_contrato !== undefined) data.fecha_contrato = body.fecha_contrato ? new Date(body.fecha_contrato) : null;
  if (body.fecha_fin_contrato !== undefined) data.fecha_fin_contrato = body.fecha_fin_contrato ? new Date(body.fecha_fin_contrato) : null;
  if (body.created_at !== undefined) data.created_at = new Date(body.created_at);
  if (body.fecha_cierre !== undefined) data.fecha_cierre = body.fecha_cierre ? new Date(body.fecha_cierre) : null;
  if (typeof es_renovacion === "boolean") data.es_renovacion = es_renovacion;
  if (operacion_original_id !== undefined) data.operacion_original_id = operacion_original_id || null;
  if (Array.isArray(body.avalistas)) {
    // Lista completa de avalistas; los campos aval_* quedan como espejo del primero
    const resolved = await resolveAvalistas(body.avalistas as AvalistaInput[], op.client_id ?? null, userId);
    Object.assign(data, legacyAvalFields(resolved), { avalistas: resolved });
  } else if (typeof tiene_aval === "boolean") {
    // Compat: payload antiguo con un único avalista
    const single: AvalistaInput[] = tiene_aval && aval_nombre ? [{
      tipo: aval_tipo === "empresa" ? "empresa" : "persona_fisica",
      nombre: aval_nombre, email: aval_email, telefono: aval_telefono,
      persona_contacto: aval_persona_contacto, dni: aval_dni, empresa: aval_empresa,
      contact_id: aval_contact_id, client_id: aval_client_id,
      cif: aval_cif, direccion: aval_direccion, cnae: aval_cnae, web: aval_web,
    }] : [];
    const resolved = await resolveAvalistas(single, op.client_id ?? null, userId);
    Object.assign(data, legacyAvalFields(resolved), { avalistas: resolved });
  }

  // Resultado: marca ganada/denegada/en curso y fija la fecha de cierre
  if (resultado === "ganada") {
    data.status = "archivada";
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
