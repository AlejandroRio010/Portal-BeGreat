import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, notes, customFields, customFieldValues, collaborators, operationDocuments, clientDocuments, avalDocuments, financialEntities, entityOffices, entityOfficeContacts, contacts, operationTasks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import { fmtEur, fmtNum } from "@/lib/format";
import { sanitizeFolderName, clientFolderPath } from "@/lib/onedrive";
import OpEditForm from "./OpEditForm";
import OpResultadoPanel from "./OpResultadoPanel";
import DocumentsSection from "@/components/DocumentsSection";

import CelebrationBanner from "@/components/CelebrationBanner";
import TasksSection from "@/components/TasksSection";

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
  const userId = (session!.user as any).collaboratorId as string;

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
      cuota_mensual: operations.cuota_mensual,
      fecha_contrato: operations.fecha_contrato,
      fecha_fin_contrato: operations.fecha_fin_contrato,
      facturacion_renting: operations.facturacion_renting,
      modalidad_renting: operations.modalidad_renting,
      importe_facturado_begreat: operations.importe_facturado_begreat,
      importe_facturado_visible: operations.importe_facturado_visible,
      motivo_denegacion: operations.motivo_denegacion,
      entity_office_id: operations.entity_office_id,
      onedrive_url: operations.onedrive_url,
      fecha_cierre: operations.fecha_cierre,
      tiene_aval: operations.tiene_aval,
      aval_tipo: operations.aval_tipo,
      aval_nombre: operations.aval_nombre,
      aval_email: operations.aval_email,
      aval_telefono: operations.aval_telefono,
      aval_persona_contacto: operations.aval_persona_contacto,
      aval_dni: operations.aval_dni,
      aval_empresa: operations.aval_empresa,
      aval_contact_id: operations.aval_contact_id,
      aval_client_id: operations.aval_client_id,
      necesidad: operations.necesidad,
      entidad_destino: operations.entidad_destino,
      entidad_visible: operations.entidad_visible,
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
    .select({ nombre: collaborators.nombre, puede_editar_ops: collaborators.puede_editar_ops, puede_enviar_recordatorios: collaborators.puede_enviar_recordatorios, nivel_entidades: collaborators.nivel_entidades, logo_url: collaborators.logo_url })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  const puedeEditar = colab?.puede_editar_ops ?? false;
  const nivelEntidades = colab?.nivel_entidades ?? 4;

  // Buscar entidad financiera por nombre para hacer link
  const entidadRecord = op.entidad_financiera
    ? await db.select({ id: financialEntities.id, nombre: financialEntities.nombre, nombre_oculto: financialEntities.nombre_oculto, tipo: financialEntities.tipo }).from(financialEntities)
        .where(eq(financialEntities.nombre, op.entidad_financiera)).limit(1).then(r => r[0] ?? null)
    : null;
  const entidadLink = entidadRecord?.id ?? null;
  const entidadOculta = nivelEntidades === 4 && entidadRecord?.nombre_oculto;
  // For non-bank entities (alternativa/renting), respect entidad_visible per operation
  const esBanco = entidadRecord?.tipo === "banco";
  const entidadOcultaPorVisibilidad = !esBanco && nivelEntidades >= 2 && op.entidad_visible === false;

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

  // Resolve aval contact's client_id for correct link
  const avalContactData = op.aval_contact_id
    ? await db.select({ id: contacts.id, client_id: contacts.client_id }).from(contacts).where(eq(contacts.id, op.aval_contact_id)).limit(1).then(r => r[0] ?? null)
    : null;

  const opNotes = await db.select().from(notes).where(eq(notes.operation_id, id)).orderBy(notes.created_at);
  const opDocs = await db.select().from(operationDocuments).where(eq(operationDocuments.operation_id, id)).orderBy(operationDocuments.created_at);
  const clientDocs = op.client_id
    ? await db.select().from(clientDocuments).where(eq(clientDocuments.client_id, op.client_id)).orderBy(clientDocuments.created_at)
    : [];
  const avalDocs = op.tiene_aval
    ? await db.select().from(avalDocuments).where(eq(avalDocuments.operation_id, id)).orderBy(avalDocuments.created_at)
    : [];
  const opTasks = await db.select().from(operationTasks).where(eq(operationTasks.operation_id, id)).orderBy(operationTasks.created_at);
  const admins = await db.select({ id: collaborators.id, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.role, "admin"));
  const taskAssignees: { id: string; nombre: string }[] = [
    { id: userId, nombre: colab?.nombre ?? "Colaborador" },
    ...admins,
  ];
  if (op.client_nombre) {
    taskAssignees.push({ id: "__cliente__", nombre: op.client_nombre });
  }
  if (op.tiene_aval) {
    const avalName = op.aval_empresa || op.aval_nombre || "Avalista";
    taskAssignees.push({ id: "__avalista__", nombre: avalName });
  }

  const clientFolder = clientFolderPath(op.client_nombre ?? "Sin cliente");
  const opFolder = `${clientFolder}/${sanitizeFolderName(op.codigo ?? id)}`;
  const avalFolder = `${opFolder}/Avalista`;

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

      {puedeEditar && !isPendiente && (
        <div className="mb-6">
          <OpResultadoPanel
            opId={op.id}
            pipelineKey={op.pipeline_key}
            currentResultado={isGanada ? "ganada" : isDenegada ? "denegada" : "en_curso"}
            motivoDenegacion={op.motivo_denegacion ?? null}
          />
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
          {(entidadOculta || entidadOcultaPorVisibilidad) ? (
            <p className="text-lg font-bold text-gray-400 italic">Confidencial</p>
          ) : nivelEntidades <= 2 && entidadLink ? (
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
              const cuota = op.cuota_mensual ? `${fmtNum(Number(op.cuota_mensual))} €/mes` : (op.importe && op.plazo_meses ? `${fmtNum(Number(op.importe) / op.plazo_meses)} €/mes` : null);
              const isRenting = op.pipeline_key === "renting";

              const modalidadLabel: Record<string, string> = {
                begreat_comisiona: "BeGreat comisiona",
                begreat_factura: "BeGreat factura",
                begreat_factura_comisiona: "BeGreat factura & comisiona",
              };

              type Campo = { label: string; value: string | null; href?: string };
              const campos: Campo[] = [];

              if (isRenting) {
                campos.push({ label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/portal/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Persona de contacto (cliente)", value: clienteContacto?.nombre ?? null, href: clienteContacto && op.client_id ? `/portal/clientes/${op.client_id}/contactos/${clienteContacto.id}` : undefined });
                campos.push({ label: "Fecha de alta", value: fmtFecha(op.created_at) });
                campos.push({ label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) });
                campos.push({ label: "Proveedor", value: op.supplier_nombre, href: op.supplier_id ? `/portal/proveedores/${op.supplier_id}` : undefined });
                campos.push({ label: "Persona de contacto (proveedor)", value: proveedorData?.persona_contacto ?? null, href: op.supplier_id ? `/portal/proveedores/${op.supplier_id}` : undefined });
                campos.push({ label: "Equipo a arrendar", value: op.descripcion });
                campos.push({ label: "Tipo de equipo", value: op.equipo_tipo });
                const bgFactura = op.modalidad_renting === "begreat_factura" || op.modalidad_renting === "begreat_factura_comisiona";
                campos.push({ label: bgFactura ? "Importe proveedor (sin IVA)" : "Importe (sin IVA)", value: fmtEuro(op.importe) });
                if (bgFactura && op.importe_facturado_begreat && op.importe_facturado_visible) {
                  campos.push({ label: "Importe facturado por BeGreat", value: fmtEuro(op.importe_facturado_begreat) });
                }
                campos.push({ label: "Plazo", value: op.plazo_meses ? `${op.plazo_meses} meses` : null });
                campos.push({ label: "Cuota mensual", value: cuota });
                campos.push({ label: "Fecha inicio contrato", value: fmtFecha(op.fecha_contrato) });
                campos.push({ label: "Fecha fin contrato", value: fmtFecha(op.fecha_fin_contrato) });
                campos.push({ label: "Lugar de instalación", value: op.lugar_entrega });
                campos.push({ label: "Modalidad", value: op.modalidad_renting ? (modalidadLabel[op.modalidad_renting] ?? op.modalidad_renting) : null });
                campos.push({ label: "Fee colaborador", value: fmtEuro(op.comision_colaborador) });
              } else {
                campos.push({ label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/portal/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Persona de contacto", value: clienteContacto?.nombre ?? null, href: clienteContacto && op.client_id ? `/portal/clientes/${op.client_id}/contactos/${clienteContacto.id}` : undefined });
                campos.push({ label: "Fecha de alta", value: fmtFecha(op.created_at) });
                campos.push({ label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) });
                campos.push({ label: "Producto solicitado", value: op.producto });
                if (op.necesidad) campos.push({ label: "Necesidad del cliente", value: op.necesidad });
                campos.push({ label: "Importe", value: fmtEuro(op.importe) });
                campos.push({ label: "Honorarios firmados", value: op.honorarios_firmado != null ? (op.honorarios_firmado ? "Sí" : "No") : null });
                campos.push({ label: "Fee colaborador", value: fmtEuro(op.comision_colaborador) });
              }

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

                  {/* Aval */}
                  {op.tiene_aval && op.aval_tipo && (
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                        {op.aval_tipo === "persona_fisica" ? "Avalista (persona física)" : "Avalista (empresa)"}
                      </dt>
                      {op.aval_tipo === "persona_fisica" ? (
                        <dd className="text-sm text-gray-800">
                          {op.aval_contact_id ? (
                            <Link href={`/portal/clientes/${avalContactData?.client_id ?? op.client_id}/contactos/${op.aval_contact_id}`} className="font-medium text-[#2E1A47] hover:underline">{op.aval_nombre}</Link>
                          ) : (
                            <p className="font-medium">{op.aval_nombre}</p>
                          )}
                          {op.aval_dni && <p className="text-xs text-gray-500">DNI: {op.aval_dni}</p>}
                          {op.aval_empresa && <p className="text-xs text-gray-500">Empresa: {op.aval_empresa}</p>}
                          {op.aval_email && <p className="text-xs text-gray-500">{op.aval_email}</p>}
                          {op.aval_telefono && <p className="text-xs text-gray-500">{op.aval_telefono}</p>}
                        </dd>
                      ) : (
                        <dd className="text-sm text-gray-800">
                          {op.aval_client_id ? (
                            <Link href={`/portal/clientes/${op.aval_client_id}`} className="font-medium text-[#2E1A47] hover:underline">{op.aval_nombre}</Link>
                          ) : (
                            <p className="font-medium">{op.aval_nombre}</p>
                          )}
                          {op.aval_persona_contacto && <p className="text-xs text-gray-500">Contacto: {op.aval_persona_contacto}</p>}
                          {op.aval_email && <p className="text-xs text-gray-500">{op.aval_email}</p>}
                        </dd>
                      )}
                    </div>
                  )}

                  {/* Entidad financiera — nivel 1-2: link, nivel 3: text, nivel 4: text o oculto */}
                  {op.entidad_financiera && !entidadOculta && !entidadOcultaPorVisibilidad && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad financiera</dt>
                      <dd className="text-sm text-gray-800 font-medium">
                        {nivelEntidades <= 2 && entidadRecord
                          ? <Link href={`/portal/entidades/${entidadRecord.id}`} className="text-[#2E1A47] hover:underline font-semibold">{op.entidad_financiera} →</Link>
                          : op.entidad_financiera}
                      </dd>
                    </div>
                  )}
                  {(entidadOculta || entidadOcultaPorVisibilidad) && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad financiera</dt>
                      <dd className="text-sm text-gray-400 italic">Confidencial</dd>
                    </div>
                  )}
                  {nivelEntidades <= 3 && op.entidad_destino && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad destino (banco final)</dt>
                      <dd className="text-sm text-gray-800 font-medium">{op.entidad_destino}</dd>
                    </div>
                  )}
                  {nivelEntidades <= 3 && opOffice && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Oficina que la estudia</dt>
                      <dd className="text-sm text-gray-800 font-medium">{opOffice.nombre}{opOffice.ciudad ? ` — ${opOffice.ciudad}` : ""}</dd>
                    </div>
                  )}
                  {nivelEntidades === 1 && officeContacts.map(c => (
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
              initialNecesidad={op.necesidad ?? null}
              initialTieneAval={op.tiene_aval ?? false}
              initialAvalTipo={op.aval_tipo ?? null}
              initialAvalNombre={op.aval_nombre ?? null}
              initialAvalEmail={op.aval_email ?? null}
              initialAvalTelefono={op.aval_telefono ?? null}
              initialAvalPersonaContacto={op.aval_persona_contacto ?? null}
              initialAvalDni={op.aval_dni ?? null}
              initialAvalEmpresa={op.aval_empresa ?? null}
              initialAvalContactId={op.aval_contact_id ?? null}
              initialAvalClientId={op.aval_client_id ?? null}
              initialModalidadRenting={op.modalidad_renting ?? null}
              initialCuotaMensual={op.cuota_mensual ?? null}
              initialFechaContrato={op.fecha_contrato ? op.fecha_contrato.toISOString().split("T")[0] : null}
              initialFechaFinContrato={op.fecha_fin_contrato ? op.fecha_fin_contrato.toISOString().split("T")[0] : null}
              initialCreatedAt={new Date(op.created_at).toISOString().split("T")[0]}
              initialFechaCierre={op.fecha_cierre ? new Date(op.fecha_cierre).toISOString().split("T")[0] : null} />
          )}
        </div>

        {/* Col 2-3: Tasks + Notas + Docs */}
        <div className="col-span-2 flex flex-col gap-5">
        <TasksSection
          initialTasks={opTasks.map(t => ({ ...t, created_at: t.created_at.toISOString(), completed_at: t.completed_at?.toISOString() ?? null }))}
          operationId={id}
          assignees={taskAssignees}
          canSendReminders
        />

        <NotesSection
          notes={opNotes}
          apiUrl={`/api/operations/${id}/notes`}
          currentUserId={userId}
          canPin
          placeholder="Añade una nota sobre esta operación..."
        />

        {op.descripcion && op.pipeline_key !== "renting" && (
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-3 pb-3 border-b border-gray-100">Presentación de la operación</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{op.descripcion}</p>
          </div>
        )}

        {op.client_id && (
          <DocumentsSection
            docs={clientDocs}
            apiUrl={`/api/clientes/${op.client_id}/documents`}
            title="Documentación del cliente"
            oneDriveFolder={clientFolder}
          />
        )}

        {op.tiene_aval && (
          <DocumentsSection
            docs={avalDocs}
            apiUrl={`/api/operations/${id}/aval-documents`}
            title="Documentación del avalista"
            oneDriveFolder={avalFolder}
          />
        )}

        <DocumentsSection docs={opDocs} operationId={id} title="Documentación de la operación" oneDriveFolder={opFolder} />
        </div>
      </div>
    </div>
  );
}
