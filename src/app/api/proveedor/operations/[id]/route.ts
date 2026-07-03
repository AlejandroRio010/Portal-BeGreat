import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sanitizeNumeric } from "@/lib/format";
import { resolveAvalistas, legacyAvalFields, type AvalistaInput } from "@/lib/avalistas";

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
          aval_dni, aval_empresa, aval_contact_id, aval_client_id,
          aval_cif, aval_direccion, aval_cnae, aval_web } = body;

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
  if (importe !== undefined) data.importe = sanitizeNumeric(importe);
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (plazo_meses !== undefined) data.plazo_meses = plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) data.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) data.equipo_tipo = equipo_tipo || null;
  if (body.cuota_mensual !== undefined) data.cuota_mensual = sanitizeNumeric(body.cuota_mensual);
  if (body.cuota_aproximada_min !== undefined) data.cuota_aproximada_min = sanitizeNumeric(body.cuota_aproximada_min);
  if (body.cuota_aproximada_max !== undefined) data.cuota_aproximada_max = sanitizeNumeric(body.cuota_aproximada_max);
  if (body.cuota_definitiva !== undefined) data.cuota_definitiva = sanitizeNumeric(body.cuota_definitiva);
  if (body.fecha_contrato !== undefined) data.fecha_contrato = body.fecha_contrato ? new Date(body.fecha_contrato) : null;
  if (body.fecha_fin_contrato !== undefined) data.fecha_fin_contrato = body.fecha_fin_contrato ? new Date(body.fecha_fin_contrato) : null;
  if (body.created_at !== undefined) data.created_at = new Date(body.created_at);
  if (body.fecha_cierre !== undefined) data.fecha_cierre = body.fecha_cierre ? new Date(body.fecha_cierre) : null;

  if (Array.isArray(body.avalistas)) {
    // Lista completa de avalistas; los campos aval_* quedan como espejo del primero
    const resolved = await resolveAvalistas(body.avalistas as AvalistaInput[], op.client_id ?? null, op.collaborator_id);
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
    const resolved = await resolveAvalistas(single, op.client_id ?? null, op.collaborator_id);
    Object.assign(data, legacyAvalFields(resolved), { avalistas: resolved });
  }

  await db.update(operations).set(data).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
