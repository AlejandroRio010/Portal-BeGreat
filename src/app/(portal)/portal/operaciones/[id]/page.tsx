import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, notes, customFields, customFieldValues, collaborators, operationDocuments, financialEntities, entityOffices, entityOfficeContacts, contacts } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import { fmtEur, fmtNum } from "@/lib/format";
import OpEditForm from "./OpEditForm";
import DocumentsSection from "@/components/DocumentsSection";
import CelebrationBanner from "@/components/CelebrationBanner";

const FASES_CONSULTORIA = ["Pre-análisis","Firma de honorarios","En estudio por entidad","Operación aprobada","Contrato firmado","Honorarios pagados"];
const FASES_RENTING = ["Pre-análisis","En estudio por entidad","Operación aprobada","Condiciones aceptadas","Contrato firmado","Transferencia realizada"];
const FASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Pre-análisis":             { bg: "bg-gray-100",     text: "text-gray-600",    border: "border-gray-200" },
  "Firma de honorarios":      { bg: "bg-blue-50",      text: "text-blue-700",    border: "border-blue-200" },
  "En estudio por entidad":   { bg: "bg-amber-50",     text: "text-amber-700",   border: "border-amber-200" },
  "Operación aprobada":       { bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-200" },
  "Condiciones aceptadas":    { bg: "bg-teal-50",      text: "text-teal-700",    border: "border-teal-200" },
  "Contrato firmado":         { bg: "bg-violet-50",    text: "text-violet-700",  border: "border-violet-200" },
  "Honorarios pagados":       { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
  "Transferencia realizada":  { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
};

export default async function OperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const [op] = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      codigo: operations.codigo,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      es_renovacion: operations.es_renovacion,
      operacion_original_id: operations.operacion_original_id,
      entidad_financiera: operations.entidad_financiera,
      honorarios_firmado: operations.honorarios_firmado,
      descripcion: operations.descripcion,
      lugar_entrega: operations.lugar_entrega,
      plazo_meses: operations.plazo_meses,
      equipo_tipo: operations.equipo_tipo,
      facturacion_renting: operations.facturacion_renting,
      motivo_denegacion: operations.motivo_denegacion,
      entity_office_id: operations.entity_office_id,
      onedrive_url: operations.onedrive_url,
      fecha_cierre: operations.fecha_cierre,
      created_at: operations.created_at,
      client_id: operations.client_id,
      client_nombre: clients.nombre,
      supplier_id: operations.supplier_id,
      supplier_nombre: suppliers.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(suppliers, eq(operations.supplier_id, suppliers.id))
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);

  if (!op) notFound();

  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops, puede_ver_entidades: collaborators.puede_ver_entidades, logo_url: collaborators.logo_url })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  const puedeEditar = colab?.puede_editar_ops ?? false;
  const puedeVerEntidades = colab?.puede_ver_entidades ?? false;

  // Buscar entidad financiera por nombre para hacer link
  const entidadRecord = op.entidad_financiera
    ? await db.select({ id: financialEntities.id, nombre: financialEntities.nombre }).from(financialEntities)
        .where(eq(financialEntities.nombre, op.entidad_financiera)).limit(1).then(r => r[0] ?? null)
    : null;
  const entidadLink = entidadRecord?.id ?? null;

  // Si es renovación, buscar op original
  const opOriginal = op.operacion_original_id
    ? await db.select({ id: operations.id, codigo: operations.codigo, nombre: operations.nombre })
        .from(operations).where(eq(operations.id, op.operacion_original_id)).limit(1).then(r => r[0] ?? null)
    : null;

  const opOffice = op.entity_office_id
    ? await db.select({ id: entityOffices.id, nombre: entityOffices.nombre, ciudad: entityOffices.ciudad, email: entityOffices.email, telefono: entityOffices.telefono })
        .from(entityOffices).where(eq(entityOffices.id, op.entity_office_id)).limit(1).then(r => r[0] ?? null)
    : null;

  const officeContacts = op.entity_office_id
    ? await db.select().from(entityOfficeContacts).where(eq(entityOfficeContacts.office_id, op.entity_office_id))
    : [];

  // Persona de contacto del cliente y del proveedor (para la ficha de renting)
  const clienteContacto = op.client_id
    ? await db.select({ id: contacts.id, nombre: contacts.nombre }).from(contacts).where(eq(contacts.client_id, op.client_id)).limit(1).then(r => r[0] ?? null)
    : null;
  const proveedorData = op.supplier_id
    ? await db.select({ id: suppliers.id, persona_contacto: suppliers.persona_contacto }).from(suppliers).where(eq(suppliers.id, op.supplier_id)).limit(1).then(r => r[0] ?? null)
    : null;

  const opNotes = await db.select().from(notes).where(eq(notes.operation_id, id)).orderBy(notes.created_at);
  const opDocs = await db.select().from(operationDocuments).where(eq(operationDocuments.operation_id, id)).orderBy(operationDocuments.created_at);

  const opCustomFields = await db.select().from(customFields).where(eq(customFields.entidad, "operacion")).orderBy(asc(customFields.orden));
  const opCustomValues = await db.select().from(customFieldValues).where(eq(customFieldValues.entity_id, id));
  const customValueMap = new Map(opCustomValues.map(v => [v.field_id, v.valor]));

  const fases = op.pipeline_key === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;
  const faseIdx = op.status === "pendiente_de_validar" ? -1 : fases.indexOf(op.fase ?? "");
  const faseStyle = op.fase ? (FASE_COLOR[op.fase] ?? FASE_COLOR["Pre-análisis"]) : FASE_COLOR["Pre-análisis"];
  // Duración apertura → cierre
  function calcDuracion(inicio: Date, fin: Date | null): string | null {
    if (!fin) return null;
    const dias = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 0) return null;
    if (dias === 0) return "mismo día";
    if (dias < 30) return `${dias} días`;
    const meses = Math.floor(dias / 30);
    const resto = dias % 30;
    if (resto === 0) return `${meses} mes${meses !== 1 ? "es" : ""}`;
    return `${meses} mes${meses !== 1 ? "es" : ""} y ${resto} días`;
  }
  const duracion = calcDuracion(op.created_at, op.fecha_cierre ?? null);

  const isPendiente = op.status === "pendiente_de_validar";
  const isArchivada = op.status === "archivada";
  const isConsultoria = op.pipeline_key === "consultoria";
  const FASES_GANADAS = ["Honorarios pagados", "Transferencia realizada"];
  const isGanada = FASES_GANADAS.includes(op.fase ?? "");
  const isDenegada = isArchivada && !isGanada;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href={isConsultoria ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting"} className="hover:text-[#2E1A47] transition-colors">
          {isConsultoria ? "Consultoría financiera" : "Renting de equipos"}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{op.nombre ?? op.client_nombre ?? "Operación"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {op.codigo && <span className="text-xs font-bold font-mono bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 tracking-wider">{op.codigo}</span>}
            {op.es_renovacion && <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5">↻ Renovación</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{op.nombre ?? op.client_nombre ?? "Operación"}</h1>
          {op.nombre && op.client_nombre && <p className="text-sm text-gray-400 mt-0.5">{op.client_nombre}</p>}
          <p className="text-sm text-gray-400 mt-1">{isConsultoria ? "Consultoría financiera" : "Renting de equipos"}</p>
        </div>
        {isPendiente ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pendiente de validar
          </span>
        ) : isDenegada ? (
          <span className="px-3 py-1.5 text-xs font-semibold border bg-red-50 border-red-200 text-red-600">
            Denegada
          </span>
        ) : isGanada ? (
          <span className="px-3 py-1.5 text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
            Ganada ✓
          </span>
        ) : (
          <span className={`px-3 py-1.5 text-xs font-semibold border ${faseStyle.bg} ${faseStyle.text} ${faseStyle.border}`}>
            {op.fase}
          </span>
        )}
      </div>

      {/* Celebration */}
      {isGanada && <CelebrationBanner opNombre={op.nombre ?? op.codigo ?? "Operación"} clientNombre={op.client_nombre ?? "Cliente"} colaboradorLogoUrl={colab?.logo_url ?? null} />}

      {/* Motivo denegación */}
      {isDenegada && op.motivo_denegacion && (
        <div className="mb-6 bg-red-50 border border-red-200 px-5 py-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Motivo de la denegación</p>
          <p className="text-sm text-red-700">{op.motivo_denegacion}</p>
        </div>
      )}

      {/* KPIs */}
      <div className={`grid gap-4 mb-6 ${duracion ? "grid-cols-5" : "grid-cols-4"}`}>
        <div className="bg-[#2E1A47] p-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Importe</p>
          <p className="text-2xl font-black text-white">
            {fmtEur(op.importe)}
          </p>
        </div>
        <div className={`p-5 border ${op.comision_colaborador ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
          <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${op.comision_colaborador ? "text-emerald-600" : "text-gray-400"}`}>
            Fee / Comisión
          </p>
          <p className={`text-2xl font-black ${op.comision_colaborador ? "text-emerald-700" : "text-gray-300"}`}>
            {op.comision_colaborador ? fmtEur(op.comision_colaborador) : "Por confirmar"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Entidad financiera</p>
          {entidadLink ? (
            <Link href={`/portal/entidades/${entidadLink}`} className="text-lg font-bold text-[#2E1A47] hover:underline">
              {op.entidad_financiera} →
            </Link>
          ) : (
            <p className="text-lg font-bold text-gray-800">{op.entidad_financiera ?? "Pendiente"}</p>
          )}
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Fecha de alta</p>
          <p className="text-lg font-bold text-gray-800">
            {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {duracion && (
          <div className="bg-[#EEEBF3] border border-[#2E1A47]/10 p-5">
            <p className="text-[#2E1A47]/60 text-xs uppercase tracking-widest mb-2 font-semibold">Tiempo de resolución</p>
            <p className="text-lg font-black text-[#2E1A47]">{duracion}</p>
            <p className="text-[#2E1A47]/40 text-[9px] mt-1 uppercase tracking-wide">apertura → cierre</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isPendiente && !isArchivada && (
        <div className="bg-white border border-gray-200 p-5 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Fase de la operación</p>
          <div className="flex items-center gap-0">
            {fases.map((fase, i) => {
              const done = i <= faseIdx;
              const current = i === faseIdx;
              return (
                <div key={fase} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-3 h-3 border-2 flex-shrink-0 transition-all ${
                      current ? "bg-[#2E1A47] border-[#2E1A47] scale-125" :
                      done    ? "bg-[#2E1A47] border-[#2E1A47]" :
                                "bg-white border-gray-300"
                    }`} />
                    <p className={`text-center mt-2 leading-tight px-1 ${
                      current ? "text-[10px] font-bold text-[#2E1A47]" :
                      done    ? "text-[10px] font-medium text-gray-500" :
                                "text-[10px] text-gray-300"
                    }`} style={{ maxWidth: 80 }}>{fase}</p>
                  </div>
                  {i < fases.length - 1 && (
                    <div className={`h-px flex-1 mx-1 -mt-5 ${i < faseIdx ? "bg-[#2E1A47]" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Col 1: Datos */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos de la operación</p>
            {(() => {
              const fmtFecha = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
              const fmtEuro = (v: string | null) => { const r = fmtEur(v); return r === "-" ? null : r; };
              const cuota = op.importe && op.plazo_meses ? `${fmtNum(Number(op.importe) / op.plazo_meses)} €/mes` : null;
              const isRenting = op.pipeline_key === "renting";

              const puedeVerComision = puedeVerEntidades; // comisión/oficina solo admin o colaboradores con derecho
              const facturaLabel = op.facturacion_renting === "begreat" ? "BeGreat factura la operación" : op.facturacion_renting === "financiera" ? "BeGreat comisiona" : null;
              const campos: { label: string; value: string | null; href?: string }[] = isRenting ? [
                { label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/portal/clientes/${op.client_id}` : undefined },
                { label: "Persona de contacto (cliente)", value: clienteContacto?.nombre ?? null, href: clienteContacto && op.client_id ? `/portal/clientes/${op.client_id}/contactos/${clienteContacto.id}` : undefined },
                { label: "Proveedor", value: op.supplier_nombre, href: op.supplier_id ? `/portal/proveedores/${op.supplier_id}` : undefined },
                { label: "Persona de contacto (proveedor)", value: proveedorData?.persona_contacto ?? null, href: op.supplier_id ? `/portal/proveedores/${op.supplier_id}` : undefined },
                { label: "Importe (sin IVA)", value: fmtEuro(op.importe) },
                { label: "Plazo", value: op.plazo_meses ? `${op.plazo_meses} meses` : null },
                { label: "Cuota (sin IVA)", value: cuota },
                { label: "Tipo de equipo", value: op.equipo_tipo },
                { label: "Descripción del equipo", value: op.descripcion },
                { label: "Lugar de instalación", value: op.lugar_entrega },
                { label: "Facturación", value: facturaLabel },
                ...(puedeVerComision ? [{ label: "Fee / Comisión", value: fmtEuro(op.comision_colaborador) }] : []),
                { label: "Fecha de alta", value: fmtFecha(op.created_at) },
                { label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) },
              ] : [
                { label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/portal/clientes/${op.client_id}` : undefined },
                { label: "Producto", value: op.producto },
                { label: "Fee / Comisión", value: fmtEuro(op.comision_colaborador) },
                { label: "Descripción", value: op.descripcion },
                { label: "Fecha de alta", value: fmtFecha(op.created_at) },
                { label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) },
                { label: "Honorarios firmados", value: op.honorarios_firmado != null ? (op.honorarios_firmado ? "Sí" : "No") : null },
              ];

              return (
                <dl className="space-y-3">
                  {campos.map(field => field.value != null && field.value !== "" ? (
                    <div key={field.label}>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</dt>
                      <dd className="text-sm text-gray-800 font-medium">
                        {field.href
                          ? <Link href={field.href} className="text-[#2E1A47] hover:underline font-semibold">{field.value}</Link>
                          : field.value}
                      </dd>
                    </div>
                  ) : null)}

                  {/* Entidad financiera — el banco siempre visible; el detalle solo con permiso */}
                  {op.entidad_financiera && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad financiera</dt>
                      <dd className="text-sm text-gray-800 font-medium">
                        {puedeVerEntidades && entidadRecord
                          ? <Link href={`/portal/entidades/${entidadRecord.id}`} className="text-[#2E1A47] hover:underline font-semibold">{op.entidad_financiera} →</Link>
                          : op.entidad_financiera}
                      </dd>
                    </div>
                  )}
                  {puedeVerEntidades && opOffice && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Oficina que la estudia</dt>
                      <dd className="text-sm text-gray-800 font-medium">{opOffice.nombre}{opOffice.ciudad ? ` — ${opOffice.ciudad}` : ""}</dd>
                      {opOffice.email && <dd className="text-xs text-gray-500 mt-0.5">{opOffice.email}</dd>}
                      {opOffice.telefono && <dd className="text-xs text-gray-500">{opOffice.telefono}</dd>}
                    </div>
                  )}
                  {puedeVerEntidades && officeContacts.map(c => (
                    <div key={c.id}>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Persona de contacto en la entidad</dt>
                      <dd className="text-sm text-gray-800 font-semibold">{c.nombre}</dd>
                      {c.rol && <dd className="text-xs text-gray-400">{c.rol}</dd>}
                      {c.email && <dd className="text-xs text-gray-500">{c.email}</dd>}
                      {c.telefono && <dd className="text-xs text-gray-500">{c.telefono}</dd>}
                    </div>
                  ))}
                  {op.es_renovacion && opOriginal && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Renovación de</dt>
                      <dd className="text-sm">
                        <Link href={`/portal/operaciones/${opOriginal.id}`} className="text-[#2E1A47] hover:underline font-semibold">
                          {opOriginal.codigo} — {opOriginal.nombre} →
                        </Link>
                      </dd>
                    </div>
                  )}
                  {op.es_renovacion && !opOriginal && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Tipo</dt>
                      <dd className="text-sm font-medium text-amber-700">Renovación de operación anterior</dd>
                    </div>
                  )}
                  {op.onedrive_url && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Documentación</dt>
                      <dd className="text-sm">
                        <a href={op.onedrive_url} target="_blank" rel="noopener noreferrer" className="text-[#2E1A47] hover:underline font-semibold">Abrir documentación →</a>
                      </dd>
                    </div>
                  )}
                </dl>
              );
            })()}
          </div>
          {puedeEditar && (
            <OpEditForm opId={op.id} pipelineKey={op.pipeline_key}
              initialProducto={op.producto ?? null} initialImporte={op.importe ?? null}
              initialDescripcion={op.descripcion ?? null} initialPlazoMeses={op.plazo_meses ?? null}
              initialLugarEntrega={op.lugar_entrega ?? null} initialEquipoTipo={op.equipo_tipo ?? null}
              initialEsRenovacion={op.es_renovacion ?? false}
              initialOpOriginal={opOriginal}
              resultadoActual={isGanada ? "ganada" : isDenegada ? "denegada" : "en_curso"} />
          )}

        </div>

        {/* Col 2-3: Notas + Docs */}
        <div className="col-span-2 flex flex-col gap-5">
        <NotesSection
          notes={opNotes}
          apiUrl={`/api/operations/${id}/notes`}
          currentUserId={userId}
          canPin
          placeholder="Añade una nota sobre esta operación..."
        />

        <DocumentsSection docs={opDocs} operationId={id} />
        </div>
      </div>
    </div>
  );
}
