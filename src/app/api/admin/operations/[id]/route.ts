import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendOperationValidatedEmail, sendOperationDeniedEmail, sendOperationWonEmail } from "@/lib/email";
import { fmtEur } from "@/lib/format";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const {
    fase,
    status,
    comision_colaborador,
    comision_colaborador_pct,
    comision_begreat,
    comision_begreat_pct,
    comision_origenes,
    factura_destinatario,
    entidad_financiera,
    entity_office_id,
    honorarios_firmado,
    notas_admin,
    facturacion_renting,
    onedrive_url,
    es_renovacion,
    // basic op fields editable by admin
    nombre,
    descripcion,
    importe,
    producto,
    plazo_meses,
    lugar_entrega,
    equipo_tipo,
    motivo_denegacion,
    operacion_original_id,
    necesidad,
    modalidad_renting,
    entidad_destino,
    entidad_visible,
    importe_facturado_begreat,
    importe_facturado_visible,
    tiene_aval,
    aval_tipo,
    aval_nombre,
    aval_email,
    aval_telefono,
    aval_persona_contacto,
    aval_dni,
    aval_empresa,
    aval_contact_id,
    aval_client_id,
    resultado,
    pipeline_key,
  } = body;

  // Fetch current state before update (for email triggers)
  const [prevOp] = await db
    .select({
      status: operations.status,
      nombre: operations.nombre,
      collaborator_id: operations.collaborator_id,
      client_id: operations.client_id,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
    })
    .from(operations)
    .where(eq(operations.id, id))
    .limit(1);

  const GANADAS = ["Honorarios pagados", "Transferencia realizada"];
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (operacion_original_id !== undefined) updateData.operacion_original_id = operacion_original_id || null;

  // Fecha de cierre: se registra al marcar ganada (fase final) o denegada (archivada); se limpia si vuelve a curso
  if (status === "archivada" || (fase && GANADAS.includes(fase))) {
    updateData.fecha_cierre = new Date();
  } else if (status === "activa") {
    updateData.fecha_cierre = null;
  }

  if (fase !== undefined) updateData.fase = fase;
  if (status !== undefined) updateData.status = status;
  if (comision_colaborador !== undefined)
    updateData.comision_colaborador = comision_colaborador === "" ? null : comision_colaborador;
  if (comision_begreat !== undefined)
    updateData.comision_begreat = comision_begreat === "" ? null : comision_begreat;
  if (comision_colaborador_pct !== undefined)
    updateData.comision_colaborador_pct = comision_colaborador_pct === "" ? null : comision_colaborador_pct;
  if (comision_begreat_pct !== undefined)
    updateData.comision_begreat_pct = comision_begreat_pct === "" ? null : comision_begreat_pct;
  if (comision_origenes !== undefined)
    updateData.comision_origenes = comision_origenes;
  if (body.colaboradores !== undefined)
    updateData.colaboradores_comision = body.colaboradores;
  if (body.margen_pct !== undefined)
    updateData.margen_pct = body.margen_pct === "" ? null : body.margen_pct;
  if (factura_destinatario !== undefined)
    updateData.factura_destinatario = factura_destinatario || null;
  if (entidad_financiera !== undefined)
    updateData.entidad_financiera = entidad_financiera === "" ? null : entidad_financiera;
  if (entity_office_id !== undefined)
    updateData.entity_office_id = entity_office_id === "" ? null : entity_office_id;
  if (honorarios_firmado !== undefined) updateData.honorarios_firmado = honorarios_firmado;
  if (notas_admin !== undefined) updateData.notas_admin = notas_admin || null;
  if (facturacion_renting !== undefined) updateData.facturacion_renting = facturacion_renting || null;
  if (onedrive_url !== undefined) updateData.onedrive_url = onedrive_url || null;
  if (es_renovacion !== undefined) updateData.es_renovacion = es_renovacion === true;
  if (nombre !== undefined) updateData.nombre = nombre || null;
  if (descripcion !== undefined) updateData.descripcion = descripcion || null;
  if (importe !== undefined) updateData.importe = importe === "" ? null : importe;
  if (producto !== undefined) updateData.producto = producto || null;
  if (plazo_meses !== undefined) updateData.plazo_meses = plazo_meses === "" ? null : plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) updateData.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) updateData.equipo_tipo = equipo_tipo || null;
  if (motivo_denegacion !== undefined) updateData.motivo_denegacion = motivo_denegacion || null;
  if (necesidad !== undefined) updateData.necesidad = necesidad || null;
  if (modalidad_renting !== undefined) updateData.modalidad_renting = modalidad_renting || null;
  if (entidad_destino !== undefined) updateData.entidad_destino = entidad_destino || null;
  if (typeof entidad_visible === "boolean") updateData.entidad_visible = entidad_visible;
  if (importe_facturado_begreat !== undefined) updateData.importe_facturado_begreat = importe_facturado_begreat || null;
  if (typeof importe_facturado_visible === "boolean") updateData.importe_facturado_visible = importe_facturado_visible;
  if (typeof tiene_aval === "boolean") {
    updateData.tiene_aval = tiene_aval;
    updateData.aval_tipo = tiene_aval ? (aval_tipo || null) : null;
    updateData.aval_nombre = tiene_aval ? (aval_nombre || null) : null;
    updateData.aval_email = tiene_aval ? (aval_email || null) : null;
    updateData.aval_telefono = tiene_aval ? (aval_telefono || null) : null;
    updateData.aval_persona_contacto = tiene_aval ? (aval_persona_contacto || null) : null;
    updateData.aval_dni = tiene_aval && aval_tipo === "persona_fisica" ? (aval_dni || null) : null;
    updateData.aval_empresa = tiene_aval && aval_tipo === "persona_fisica" ? (aval_empresa || null) : null;
    let resolvedContactId = aval_contact_id || null;
    if (tiene_aval && aval_tipo === "persona_fisica" && !aval_contact_id && aval_nombre && prevOp?.client_id) {
      const [existing] = await db.select({ id: contacts.id }).from(contacts)
        .where(and(eq(contacts.client_id, prevOp.client_id), eq(contacts.nombre, aval_nombre))).limit(1);
      if (existing) {
        resolvedContactId = existing.id;
      } else {
        const [newContact] = await db.insert(contacts).values({
          client_id: prevOp.client_id,
          nombre: aval_nombre,
          email: aval_email || null,
          telefono: aval_telefono || null,
          rol: aval_persona_contacto || null,
        }).returning();
        resolvedContactId = newContact.id;
      }
    }
    updateData.aval_contact_id = tiene_aval && aval_tipo === "persona_fisica" ? resolvedContactId : null;
    updateData.aval_client_id = tiene_aval && aval_tipo === "empresa" ? (aval_client_id || null) : null;
  }

  if (resultado === "ganada") {
    updateData.status = "activa";
    updateData.fase = pipeline_key === "renting" ? "Transferencia realizada" : "Honorarios pagados";
    updateData.fecha_cierre = new Date();
  } else if (resultado === "denegada") {
    updateData.status = "archivada";
    updateData.fecha_cierre = new Date();
    updateData.motivo_denegacion = motivo_denegacion || null;
  } else if (resultado === "en_curso") {
    updateData.status = "activa";
    updateData.fecha_cierre = null;
  }

  await db.update(operations).set(updateData).where(eq(operations.id, id));

  // ─── Email notifications (fire-and-forget) ─────────────────────────────────
  if (prevOp) {
    const wasValidated = prevOp.status === "pendiente_de_validar" && status === "activa";
    const wasDenied = status === "archivada" && prevOp.status !== "archivada";
    const wasWon = resultado === "ganada";

    if (wasValidated || wasDenied || wasWon) {
      (async () => {
        try {
          const [colab] = await db
            .select({ email: collaborators.email, nombre: collaborators.nombre })
            .from(collaborators)
            .where(eq(collaborators.id, prevOp.collaborator_id))
            .limit(1);
          if (!colab) return;

          if (wasWon) {
            await sendOperationWonEmail(
              colab.email, colab.nombre, prevOp.nombre ?? "Operación", id,
              fmtEur(prevOp.importe), fmtEur(prevOp.comision_colaborador)
            );
          } else if (wasValidated) {
            await sendOperationValidatedEmail(colab.email, colab.nombre, prevOp.nombre ?? "Operación", id);
          } else if (wasDenied) {
            await sendOperationDeniedEmail(
              colab.email, colab.nombre, prevOp.nombre ?? "Operación", id,
              (motivo_denegacion as string) ?? ""
            );
          }
        } catch (e: any) {
          console.error("[OpEmail]", e.message);
        }
      })();
    }
  }

  return NextResponse.json({ ok: true });
}
