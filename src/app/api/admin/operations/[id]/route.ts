import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators, clients, supplierUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendOperationValidatedEmail, sendOperationDeniedEmail, sendOperationWonEmail, sendSupplierOperationDeniedEmail } from "@/lib/email";
import { fmtEur, sanitizeNumeric } from "@/lib/format";
import { resolveAvalistas, legacyAvalFields, type AvalistaInput } from "@/lib/avalistas";

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
    aval_cif, aval_direccion, aval_cnae, aval_web,
    resultado,
    pipeline_key,
    collaborator_id,
    supplier_id,
    holded_invoice_id,
    holded_invoice_number,
    holded_invoices,
  } = body;

  // Fetch current state before update (for email triggers)
  const [prevOp] = await db
    .select({
      status: operations.status,
      nombre: operations.nombre,
      collaborator_id: operations.collaborator_id,
      client_id: operations.client_id,
      supplier_id: operations.supplier_id,
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
    updateData.comision_colaborador = sanitizeNumeric(comision_colaborador);
  if (comision_begreat !== undefined)
    updateData.comision_begreat = sanitizeNumeric(comision_begreat);
  if (comision_colaborador_pct !== undefined)
    updateData.comision_colaborador_pct = sanitizeNumeric(comision_colaborador_pct);
  if (comision_begreat_pct !== undefined)
    updateData.comision_begreat_pct = sanitizeNumeric(comision_begreat_pct);
  if (comision_origenes !== undefined)
    updateData.comision_origenes = comision_origenes;
  if (body.colaboradores !== undefined)
    updateData.colaboradores_comision = body.colaboradores;
  if (body.margen_pct !== undefined)
    updateData.margen_pct = sanitizeNumeric(body.margen_pct);
  if (factura_destinatario !== undefined)
    updateData.factura_destinatario = factura_destinatario || null;
  if (entidad_financiera !== undefined) {
    updateData.entidad_financiera = entidad_financiera === "" ? null : entidad_financiera;
    // Auto-update operation name with entity
    if (prevOp?.client_id) {
      const [cli] = await db.select({ nombre: clients.nombre, nombre_comercial: clients.nombre_comercial }).from(clients).where(eq(clients.id, prevOp.client_id)).limit(1);
      if (cli) {
        const dn = cli.nombre_comercial?.trim() || cli.nombre;
        const currentName = prevOp.nombre ?? "";
        const opMatch = currentName.match(/- OP (\d+)/);
        const opNum = opMatch ? opMatch[1] : "1";
        const ent = entidad_financiera && entidad_financiera !== "" ? ` (${entidad_financiera})` : "";
        updateData.nombre = `${dn} - OP ${opNum}${ent}`;
      }
    }
  }
  if (entity_office_id !== undefined)
    updateData.entity_office_id = entity_office_id === "" ? null : entity_office_id;
  if (honorarios_firmado !== undefined) updateData.honorarios_firmado = honorarios_firmado;
  if (notas_admin !== undefined) updateData.notas_admin = notas_admin || null;
  if (facturacion_renting !== undefined) updateData.facturacion_renting = facturacion_renting || null;
  if (onedrive_url !== undefined) updateData.onedrive_url = onedrive_url || null;
  if (es_renovacion !== undefined) updateData.es_renovacion = es_renovacion === true;
  if (nombre !== undefined) updateData.nombre = nombre || null;
  if (descripcion !== undefined) updateData.descripcion = descripcion || null;
  if (importe !== undefined) updateData.importe = sanitizeNumeric(importe);
  if (producto !== undefined) updateData.producto = producto || null;
  if (plazo_meses !== undefined) updateData.plazo_meses = plazo_meses === "" ? null : plazo_meses ? Number(plazo_meses) : null;
  if (lugar_entrega !== undefined) updateData.lugar_entrega = lugar_entrega || null;
  if (equipo_tipo !== undefined) updateData.equipo_tipo = equipo_tipo || null;
  if (body.fecha_contrato !== undefined) updateData.fecha_contrato = body.fecha_contrato ? new Date(body.fecha_contrato) : null;
  if (body.fecha_fin_contrato !== undefined) updateData.fecha_fin_contrato = body.fecha_fin_contrato ? new Date(body.fecha_fin_contrato) : null;
  if (body.created_at !== undefined) updateData.created_at = new Date(body.created_at);
  if (body.fecha_cierre !== undefined) updateData.fecha_cierre = body.fecha_cierre ? new Date(body.fecha_cierre) : null;
  if (motivo_denegacion !== undefined) updateData.motivo_denegacion = motivo_denegacion || null;
  if (necesidad !== undefined) updateData.necesidad = necesidad || null;
  if (modalidad_renting !== undefined) updateData.modalidad_renting = modalidad_renting || null;
  if (entidad_destino !== undefined) updateData.entidad_destino = entidad_destino || null;
  if (typeof entidad_visible === "boolean") updateData.entidad_visible = entidad_visible;
  if (importe_facturado_begreat !== undefined) updateData.importe_facturado_begreat = sanitizeNumeric(importe_facturado_begreat);
  if (typeof importe_facturado_visible === "boolean") updateData.importe_facturado_visible = importe_facturado_visible;
  if (collaborator_id !== undefined) updateData.collaborator_id = collaborator_id || null;
  if (supplier_id !== undefined) updateData.supplier_id = supplier_id || null;
  if (Array.isArray(holded_invoices)) {
    // Nueva vía: lista de facturas [{id, number}]; el single es espejo del primero
    const lista = holded_invoices.filter((f: any) => f && f.id).map((f: any) => ({ id: f.id, number: f.number ?? null }));
    updateData.holded_invoices = lista;
    updateData.holded_invoice_id = lista[0]?.id ?? null;
    updateData.holded_invoice_number = lista[0]?.number ?? null;
  } else if (holded_invoice_id !== undefined) {
    updateData.holded_invoice_id = holded_invoice_id || null;
    updateData.holded_invoice_number = holded_invoice_id ? (holded_invoice_number || null) : null;
    updateData.holded_invoices = holded_invoice_id ? [{ id: holded_invoice_id, number: holded_invoice_number ?? null }] : [];
  }
  if (Array.isArray(body.avalistas)) {
    // Lista completa de avalistas; los campos aval_* quedan como espejo del primero
    const resolved = await resolveAvalistas(body.avalistas as AvalistaInput[], prevOp?.client_id ?? null, prevOp?.collaborator_id ?? null);
    Object.assign(updateData, legacyAvalFields(resolved), { avalistas: resolved });
  } else if (typeof tiene_aval === "boolean") {
    // Compat: payload antiguo con un único avalista
    const single: AvalistaInput[] = tiene_aval && aval_nombre ? [{
      tipo: aval_tipo === "empresa" ? "empresa" : "persona_fisica",
      nombre: aval_nombre, email: aval_email, telefono: aval_telefono,
      persona_contacto: aval_persona_contacto, dni: aval_dni, empresa: aval_empresa,
      contact_id: aval_contact_id, client_id: aval_client_id,
      cif: aval_cif, direccion: aval_direccion, cnae: aval_cnae, web: aval_web,
    }] : [];
    const resolved = await resolveAvalistas(single, prevOp?.client_id ?? null, prevOp?.collaborator_id ?? null);
    Object.assign(updateData, legacyAvalFields(resolved), { avalistas: resolved });
  }

  if (resultado === "ganada") {
    updateData.status = "archivada";
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

  // ─── Email notifications ────────────────────────────────────────────────────
  if (prevOp) {
    const wasValidated = prevOp.status === "pendiente_de_validar" && (status === "activa" || resultado === "en_curso");
    const wasDenied = resultado === "denegada" || (status === "archivada" && prevOp.status !== "archivada");
    const wasWon = resultado === "ganada";

    if (wasValidated || wasDenied || wasWon) {
      try {
        const [colab] = await db
          .select({ email: collaborators.email, nombre: collaborators.nombre })
          .from(collaborators)
          .where(eq(collaborators.id, prevOp.collaborator_id))
          .limit(1);

        if (colab) {
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
        }
      } catch (e: any) {
        console.error("[OpEmail]", e.message);
      }
    }

    // Supplier email on deny
    if (wasDenied && prevOp.supplier_id) {
      (async () => {
        try {
          const users = await db.select({ email: supplierUsers.email, nombre: supplierUsers.nombre })
            .from(supplierUsers)
            .where(and(eq(supplierUsers.supplier_id, prevOp.supplier_id!), eq(supplierUsers.activo, true)));
          for (const u of users) {
            await sendSupplierOperationDeniedEmail(u.email, u.nombre, prevOp.nombre ?? "Operación", (motivo_denegacion as string) ?? "");
          }
        } catch (e: any) { console.error("[SupplierEmail]", e.message); }
      })();
    }
  }

  return NextResponse.json({ ok: true });
}
