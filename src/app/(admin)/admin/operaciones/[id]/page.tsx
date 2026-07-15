import { db } from "@/db";
import { operations, clients, suppliers, notes, collaborators, customFields, customFieldValues, financialEntities, entityOffices, entityOfficeContacts, operationDocuments, clientDocuments, avalDocuments, contacts, operationTasks } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { avalistasDeOp } from "@/lib/avalistas";
import { getFacturaVentaById } from "@/lib/holded";
import Link from "next/link";
import AdminOpForm from "./AdminOpForm";
import AdminOpResultadoPanel from "./AdminOpResultadoPanel";
import NotesSection from "@/components/NotesSection";
import DocumentsSection from "@/components/DocumentsSection";
import TasksSection from "@/components/TasksSection";
import { auth } from "@/lib/auth";
import CelebrationBanner from "@/components/CelebrationBanner";
import DuplicateButton from "./DuplicateButton";
import { fmtEur, fmtNum } from "@/lib/format";
import { sanitizeFolderName, clientFolderPath } from "@/lib/onedrive";
import AsignarResponsable from "@/components/AsignarResponsable";

const FASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Pre-análisis":        { bg: "bg-gray-100",     text: "text-gray-600",    border: "border-gray-200" },
  "Firma de honorarios":       { bg: "bg-blue-50",      text: "text-blue-700",    border: "border-blue-200" },
  "En estudio por entidad": { bg: "bg-amber-50",     text: "text-amber-700",   border: "border-amber-200" },
  "Operación aprobada":  { bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-200" },
  "Condiciones aceptadas":      { bg: "bg-teal-50",      text: "text-teal-700",    border: "border-teal-200" },
  "Contrato firmado":     { bg: "bg-violet-50",    text: "text-violet-700",  border: "border-violet-200" },
  "Honorarios pagados":           { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
  "Transferencia realizada":     { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
};

const FASES_CONSULTORIA = ["Pre-análisis","Firma de honorarios","En estudio por entidad","Operación aprobada","Contrato firmado","Honorarios pagados"];
const FASES_RENTING = ["Pre-análisis","En estudio por entidad","Operación aprobada","Condiciones aceptadas","Contrato firmado","Transferencia realizada"];

export default async function AdminOperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const adminId = session?.user?.id as string;

  const [op] = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      comision_colaborador_pct: operations.comision_colaborador_pct,
      comision_begreat: operations.comision_begreat,
      comision_begreat_pct: operations.comision_begreat_pct,
      comision_origenes: operations.comision_origenes,
      factura_destinatario: operations.factura_destinatario,
      colaboradores_comision: operations.colaboradores_comision,
      margen_pct: operations.margen_pct,
      entidad_financiera: operations.entidad_financiera,
      honorarios_firmado: operations.honorarios_firmado,
      descripcion: operations.descripcion,
      lugar_entrega: operations.lugar_entrega,
      contacto_directo: operations.contacto_directo,
      renting_rol: operations.renting_rol,
      equipo_tipo: operations.equipo_tipo,
      plazo_meses: operations.plazo_meses,
      cuota_mensual: operations.cuota_mensual,
      cuota_aproximada_min: operations.cuota_aproximada_min,
      cuota_aproximada_max: operations.cuota_aproximada_max,
      cuota_definitiva: operations.cuota_definitiva,
      fecha_contrato: operations.fecha_contrato,
      fecha_fin_contrato: operations.fecha_fin_contrato,
      notas_admin: operations.notas_admin,
      facturacion_renting: operations.facturacion_renting,
      es_renovacion: operations.es_renovacion,
      operacion_original_id: operations.operacion_original_id,
      onedrive_url: operations.onedrive_url,
      motivo_denegacion: operations.motivo_denegacion,
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
      avalistas: operations.avalistas,
      holded_invoice_id: operations.holded_invoice_id,
      holded_invoice_number: operations.holded_invoice_number,
      necesidad: operations.necesidad,
      modalidad_renting: operations.modalidad_renting,
      importe_facturado_begreat: operations.importe_facturado_begreat,
      importe_facturado_visible: operations.importe_facturado_visible,
      entidad_destino: operations.entidad_destino,
      entidad_visible: operations.entidad_visible,
      supplier_id: operations.supplier_id,
      codigo: operations.codigo,
      created_at: operations.created_at,
      updated_at: operations.updated_at,
      client_id: operations.client_id,
      client_nombre: clients.nombre,
      supplier_nombre: suppliers.nombre,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
      entity_office_id: operations.entity_office_id,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(suppliers, eq(operations.supplier_id, suppliers.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .where(eq(operations.id, id))
    .limit(1);

  if (!op) notFound();

  // Entities + offices for the admin selector
  const allEntities = await db
    .select({ id: financialEntities.id, nombre: financialEntities.nombre, tipo: financialEntities.tipo })
    .from(financialEntities)
    .orderBy(financialEntities.nombre);

  const allOffices = await db
    .select({ id: entityOffices.id, entity_id: entityOffices.entity_id, nombre: entityOffices.nombre, ciudad: entityOffices.ciudad })
    .from(entityOffices)
    .orderBy(entityOffices.nombre);

  const opDocs = await db.select().from(operationDocuments).where(eq(operationDocuments.operation_id, id)).orderBy(operationDocuments.created_at);
  const clientDocs = op.client_id
    ? await db.select().from(clientDocuments).where(eq(clientDocuments.client_id, op.client_id)).orderBy(clientDocuments.created_at)
    : [];
  const avalDocs = op.tiene_aval
    ? await db.select().from(avalDocuments).where(eq(avalDocuments.operation_id, id)).orderBy(avalDocuments.created_at)
    : [];

  // Lista de avalistas (columna nueva con fallback a los campos legacy)
  const avalistasList = avalistasDeOp(op);
  const avalContactIds = avalistasList.map(a => a.contact_id).filter((x): x is string => !!x);
  const avalContactsData = avalContactIds.length > 0
    ? await db.select({ id: contacts.id, client_id: contacts.client_id }).from(contacts).where(inArray(contacts.id, avalContactIds))
    : [];
  const avalContactClientId = (contactId: string | null) =>
    avalContactsData.find(c => c.id === contactId)?.client_id ?? op.client_id;

  // Estado de la factura vinculada de Holded (si la hay)
  const holdedFactura = op.holded_invoice_id ? await getFacturaVentaById(op.holded_invoice_id) : null;

  const opNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.operation_id, id))
    .orderBy(notes.created_at);

  const opTasks = await db.select().from(operationTasks).where(eq(operationTasks.operation_id, id)).orderBy(operationTasks.created_at);

  const admins = await db.select({ id: collaborators.id, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.role, "admin"));
  const allColaboradores = await db.select({ id: collaborators.id, nombre: collaborators.nombre, role: collaborators.role }).from(collaborators).where(eq(collaborators.activo, true)).orderBy(collaborators.nombre);
  const taskAssignees: { id: string; nombre: string }[] = [];
  if (op.colaborador_id && op.colaborador_nombre) {
    taskAssignees.push({ id: op.colaborador_id, nombre: op.colaborador_nombre });
  }
  for (const a of admins) {
    taskAssignees.push({ id: a.id, nombre: a.nombre });
  }
  if (op.client_nombre) {
    taskAssignees.push({ id: "__cliente__", nombre: op.client_nombre });
  }
  if (avalistasList.length > 0) {
    const avalName = avalistasList.map(a => a.nombre).join(", ") || "Avalista";
    taskAssignees.push({ id: "__avalista__", nombre: avalName });
  }

  const clientFolder = clientFolderPath(op.client_nombre ?? "Sin cliente");
  const opFolder = `${clientFolder}/${sanitizeFolderName(op.codigo ?? id)}`;

  const opCustomFields = await db
    .select()
    .from(customFields)
    .where(eq(customFields.entidad, "operacion"))
    .orderBy(asc(customFields.orden));

  const opCustomValues = await db
    .select()
    .from(customFieldValues)
    .where(eq(customFieldValues.entity_id, id));

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

  // Entidad financiera + oficina + contactos de la oficina
  const entidadFinanciera = op.entidad_financiera
    ? await db.select({ id: financialEntities.id, nombre: financialEntities.nombre })
        .from(financialEntities).where(eq(financialEntities.nombre, op.entidad_financiera)).limit(1).then(r => r[0] ?? null)
    : null;

  const opOffice = op.entity_office_id
    ? await db.select({ id: entityOffices.id, nombre: entityOffices.nombre, ciudad: entityOffices.ciudad, email: entityOffices.email, telefono: entityOffices.telefono })
        .from(entityOffices).where(eq(entityOffices.id, op.entity_office_id)).limit(1).then(r => r[0] ?? null)
    : null;

  // Operación original (si es renovación)
  const opOriginal = op.operacion_original_id
    ? await db.select({ id: operations.id, codigo: operations.codigo, nombre: operations.nombre })
        .from(operations).where(eq(operations.id, op.operacion_original_id)).limit(1).then(r => r[0] ?? null)
    : null;

  // Logo del colaborador para la celebración
  const colabLogo = op.colaborador_id
    ? await db.select({ logo_url: collaborators.logo_url }).from(collaborators).where(eq(collaborators.id, op.colaborador_id)).limit(1).then(r => r[0]?.logo_url ?? null)
    : null;

  const officeContacts = op.entity_office_id
    ? await db.select().from(entityOfficeContacts).where(eq(entityOfficeContacts.office_id, op.entity_office_id))
    : [];

  const clienteContacto = op.client_id
    ? await db.select({ id: contacts.id, nombre: contacts.nombre }).from(contacts).where(eq(contacts.client_id, op.client_id)).limit(1).then(r => r[0] ?? null)
    : null;
  const proveedorData = op.supplier_id
    ? await db.select({ id: suppliers.id, persona_contacto: suppliers.persona_contacto }).from(suppliers).where(eq(suppliers.id, op.supplier_id)).limit(1).then(r => r[0] ?? null)
    : null;

  const fases = op.pipeline_key === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;
  const faseIdx = op.status === "pendiente_de_validar" ? -1 : fases.indexOf(op.fase ?? "");
  const faseStyle = op.fase ? (FASE_COLOR[op.fase] ?? FASE_COLOR["Pre-análisis"]) : FASE_COLOR["Pre-análisis"];

  const isPendiente = op.status === "pendiente_de_validar";
  const isConsultoria = op.pipeline_key === "consultoria";
  const FASES_GANADAS = ["Honorarios pagados", "Transferencia realizada"];
  const isGanada = FASES_GANADAS.includes(op.fase ?? "");

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/admin/operaciones" className="hover:text-[#2E1A47] transition-colors">Operaciones</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{op.nombre ?? op.client_nombre ?? "Operación"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {op.codigo && <span className="text-xs font-bold font-mono bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 tracking-wider">{op.codigo}</span>}
            <p className="text-xs text-gray-400 uppercase tracking-widest">{op.colaborador_nombre}</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{op.nombre ?? op.client_nombre ?? "Operación"}</h1>
          {op.nombre && op.client_nombre && (
            <p className="text-sm text-gray-400 mt-0.5">{op.client_nombre}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">{isConsultoria ? "Consultoría financiera" : "Renting de equipos"}</p>
        </div>
        <div className="flex items-center gap-2">
          <DuplicateButton opId={op.id} />
          {isPendiente ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Pendiente de validar
            </span>
          ) : op.status === "archivada" ? (
            <span className="px-3 py-1.5 text-xs font-semibold border bg-red-50 border-red-200 text-red-600">
              Archivada
            </span>
          ) : (
            <span className={`px-3 py-1.5 text-xs font-semibold border ${faseStyle.bg} ${faseStyle.text} ${faseStyle.border}`}>
              {op.fase}
            </span>
          )}
        </div>
      </div>

      {/* Celebration */}
      {isGanada && <CelebrationBanner opNombre={op.nombre ?? op.codigo ?? "Operación"} clientNombre={op.client_nombre ?? "Cliente"} colaboradorLogoUrl={colabLogo} />}

      {/* Resultado (denegada/ganada/en curso) */}
      {!isPendiente && (
        <div className="mb-6">
          <AdminOpResultadoPanel
            opId={op.id}
            pipelineKey={op.pipeline_key}
            currentResultado={isGanada ? "ganada" : op.status === "archivada" ? "denegada" : "en_curso"}
            motivoDenegacion={op.motivo_denegacion ?? null}
          />
        </div>
      )}

      {/* Estado de facturación (Holded) */}
      {holdedFactura && (
        <div className={`mb-6 flex items-center justify-between px-5 py-3.5 border ${
          holdedFactura.estado === "cobrada" ? "bg-emerald-50 border-emerald-200" :
          holdedFactura.estado === "parcial" ? "bg-amber-50 border-amber-200" :
          "bg-red-50 border-red-200"}`}>
          <div>
            <p className={`text-sm font-bold ${holdedFactura.estado === "cobrada" ? "text-emerald-700" : holdedFactura.estado === "parcial" ? "text-amber-700" : "text-red-600"}`}>
              {holdedFactura.estado === "cobrada" ? "✓ Facturada y cobrada" : holdedFactura.estado === "parcial" ? "Facturada · cobro parcial" : "Facturada · pendiente de cobro"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Factura {holdedFactura.document_number} · {fmtEur(holdedFactura.total)}
              {" · emitida el "}{new Date(holdedFactura.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              {holdedFactura.fecha_cobro
                ? ` · cobrada el ${new Date(holdedFactura.fecha_cobro).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`
                : " · aún sin cobrar"}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Holded</span>
        </div>
      )}

      {/* KPIs */}
      <div className={`grid gap-4 mb-6 ${duracion ? "grid-cols-6" : "grid-cols-5"}`}>
        <div className="bg-[#2E1A47] p-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Importe</p>
          <p className="text-2xl font-black text-white">
            {fmtEur(op.importe)}
          </p>
        </div>
        <div className={`p-5 border ${op.comision_colaborador ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
          <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${op.comision_colaborador ? "text-emerald-600" : "text-gray-400"}`}>
            Fee colaborador
          </p>
          <p className={`text-2xl font-black ${op.comision_colaborador ? "text-emerald-700" : "text-gray-300"}`}>
            {fmtEur(op.comision_colaborador)}
          </p>
        </div>
        <div className={`p-5 border ${op.comision_begreat ? "bg-[#EEEBF3] border-[#2E1A47]/20" : "bg-white border-gray-200"}`}>
          <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${op.comision_begreat ? "text-[#2E1A47]/60" : "text-gray-400"}`}>
            Fee BeGreat
          </p>
          <p className={`text-2xl font-black ${op.comision_begreat ? "text-[#2E1A47]" : "text-gray-300"}`}>
            {fmtEur(op.comision_begreat)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Entidad financiera</p>
          {entidadFinanciera ? (
            <Link href={`/admin/entidades/${entidadFinanciera.id}`} className="text-lg font-bold text-[#2E1A47] hover:underline">{op.entidad_financiera} →</Link>
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
            <p className="text-[#2E1A47]/60 text-xs uppercase tracking-widest mb-2 font-semibold">Tiempo resolución</p>
            <p className="text-lg font-black text-[#2E1A47]">{duracion}</p>
            <p className="text-[#2E1A47]/40 text-[9px] mt-1 uppercase tracking-wide">apertura → cierre</p>
          </div>
        )}
      </div>

      {/* Progress bar — ocultar en ganadas */}
      {!isPendiente && op.status !== "archivada" && !isGanada && (
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
                    }`} style={{ maxWidth: 80 }}>
                      {fase}
                    </p>
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

      {/* Main grid: fields + notes + admin panel */}
      <div className="grid grid-cols-3 gap-5">
        {/* Fields */}
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
                campos.push({ label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/admin/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Persona de contacto (cliente)", value: clienteContacto?.nombre ?? null, href: clienteContacto && op.client_id ? `/admin/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Fecha de alta", value: fmtFecha(op.created_at) });
                campos.push({ label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) });
                campos.push({ label: "Proveedor", value: op.supplier_nombre, href: op.supplier_id ? `/admin/proveedores/${op.supplier_id}` : undefined });
                campos.push({ label: "Persona de contacto (proveedor)", value: proveedorData?.persona_contacto ?? null, href: op.supplier_id ? `/admin/proveedores/${op.supplier_id}` : undefined });
                campos.push({ label: "Equipo a arrendar", value: op.descripcion });
                campos.push({ label: "Tipo de equipo", value: op.equipo_tipo });
                const bgFactura = op.modalidad_renting === "begreat_factura" || op.modalidad_renting === "begreat_factura_comisiona";
                campos.push({ label: bgFactura ? "Importe proveedor (sin IVA)" : "Importe (sin IVA)", value: fmtEuro(op.importe) });
                if (bgFactura) {
                  campos.push({ label: "Importe facturado por BeGreat", value: fmtEuro(op.importe_facturado_begreat) });
                }
                campos.push({ label: "Plazo", value: op.plazo_meses ? `${op.plazo_meses} meses` : null });
                const cuotaAprox = op.cuota_aproximada_min && op.cuota_aproximada_max
                  ? `${fmtNum(Number(op.cuota_aproximada_min))} – ${fmtNum(Number(op.cuota_aproximada_max))} €/mes`
                  : op.cuota_aproximada_min ? `${fmtNum(Number(op.cuota_aproximada_min))} €/mes`
                  : null;
                campos.push({ label: "Cuota aproximada", value: cuotaAprox });
                campos.push({ label: "Cuota definitiva", value: op.cuota_definitiva ? `${fmtNum(Number(op.cuota_definitiva))} €/mes` : null });
                campos.push({ label: "Fecha inicio contrato", value: fmtFecha(op.fecha_contrato) });
                campos.push({ label: "Fecha fin contrato", value: fmtFecha(op.fecha_fin_contrato) });
                campos.push({ label: "Lugar de instalación", value: op.lugar_entrega });
                campos.push({ label: "Modalidad", value: op.modalidad_renting ? (modalidadLabel[op.modalidad_renting] ?? op.modalidad_renting) : null });
                campos.push({ label: "Fee colaborador", value: fmtEuro(op.comision_colaborador) });
                campos.push({ label: "Fee BeGreat", value: fmtEuro(op.comision_begreat) });
              } else {
                campos.push({ label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/admin/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Persona de contacto", value: clienteContacto?.nombre ?? null, href: clienteContacto && op.client_id ? `/admin/clientes/${op.client_id}` : undefined });
                campos.push({ label: "Fecha de alta", value: fmtFecha(op.created_at) });
                campos.push({ label: "Fecha de cierre", value: fmtFecha(op.fecha_cierre) });
                campos.push({ label: "Producto solicitado", value: op.producto });
                if (op.necesidad) campos.push({ label: "Necesidad del cliente", value: op.necesidad });
                campos.push({ label: "Importe", value: fmtEuro(op.importe) });
                campos.push({ label: "Honorarios firmados", value: op.honorarios_firmado != null ? (op.honorarios_firmado ? "Sí" : "No") : null });
                campos.push({ label: "Fee colaborador", value: fmtEuro(op.comision_colaborador) });
                campos.push({ label: "Fee BeGreat", value: fmtEuro(op.comision_begreat) });
              }

              return (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Colaborador</dt>
                    <dd><AsignarResponsable currentId={op.colaborador_id} currentNombre={op.colaborador_nombre} patchUrl={`/api/admin/operations/${op.id}`} /></dd>
                  </div>
                  {campos.map(field => field.value != null && field.value !== "" ? (
                    <div key={field.label}>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</dt>
                      <dd className="text-sm text-gray-800 font-medium">
                        {field.href
                          ? <Link href={field.href} className="text-[#2E1A47] hover:underline font-semibold">{field.value} →</Link>
                          : field.value}
                      </dd>
                    </div>
                  ) : null)}

                  {/* Avalistas */}
                  {avalistasList.map((av, avIdx) => (
                    <div key={avIdx} className="pt-3 mt-3 border-t border-gray-100">
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                        {`Avalista ${avIdx + 1} `}
                        {av.tipo === "persona_fisica" ? "(persona física)" : "(empresa)"}
                      </dt>
                      {av.tipo === "persona_fisica" ? (
                        <dd className="text-sm text-gray-800">
                          {av.contact_id ? (
                            <Link href={`/admin/clientes/${avalContactClientId(av.contact_id)}/contactos/${av.contact_id}`} className="font-medium text-[#2E1A47] hover:underline">{av.nombre}</Link>
                          ) : (
                            <p className="font-medium">{av.nombre}</p>
                          )}
                          {av.dni && <p className="text-xs text-gray-500">DNI: {av.dni}</p>}
                          {av.empresa && <p className="text-xs text-gray-500">Empresa: {av.empresa}</p>}
                          {av.email && <p className="text-xs text-gray-500">{av.email}</p>}
                          {av.telefono && <p className="text-xs text-gray-500">{av.telefono}</p>}
                        </dd>
                      ) : (
                        <dd className="text-sm text-gray-800">
                          {av.client_id ? (
                            <Link href={`/admin/clientes/${av.client_id}`} className="font-medium text-[#2E1A47] hover:underline">{av.nombre}</Link>
                          ) : (
                            <p className="font-medium">{av.nombre}</p>
                          )}
                          {av.persona_contacto && <p className="text-xs text-gray-500">Contacto: {av.persona_contacto}</p>}
                          {av.email && <p className="text-xs text-gray-500">{av.email}</p>}
                        </dd>
                      )}
                    </div>
                  ))}

                  {/* Entidad financiera */}
                  {op.entidad_financiera && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad financiera</dt>
                      <dd className="text-sm text-gray-800 font-medium">
                        {entidadFinanciera
                          ? <Link href={`/admin/entidades/${entidadFinanciera.id}`} className="text-[#2E1A47] hover:underline font-semibold">{op.entidad_financiera} →</Link>
                          : op.entidad_financiera}
                      </dd>
                    </div>
                  )}
                  {/* Entidad destino (broker → banco final) */}
                  {op.entidad_destino && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad destino (banco final)</dt>
                      <dd className="text-sm text-gray-800 font-medium">{op.entidad_destino}</dd>
                    </div>
                  )}
                  {opOffice && (
                    <div>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Oficina que la estudia</dt>
                      <dd className="text-sm text-gray-800 font-medium">{opOffice.nombre}{opOffice.ciudad ? ` — ${opOffice.ciudad}` : ""}</dd>
                      {opOffice.email && <dd className="text-xs text-gray-500 mt-0.5">{opOffice.email}</dd>}
                      {opOffice.telefono && <dd className="text-xs text-gray-500">{opOffice.telefono}</dd>}
                    </div>
                  )}
                  {officeContacts.map(c => (
                    <div key={c.id}>
                      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Persona de contacto en la entidad</dt>
                      <dd className="text-sm text-gray-800 font-semibold">{c.nombre}</dd>
                      {c.rol && <dd className="text-xs text-gray-400">{c.rol}</dd>}
                      {c.email && <dd className="text-xs text-gray-500">{c.email}</dd>}
                      {c.telefono && <dd className="text-xs text-gray-500">{c.telefono}</dd>}
                    </div>
                  ))}
                  {/* Campos personalizados rellenos */}
                  {opCustomFields
                    .filter((f) => { const v = opCustomValues.find((cv) => cv.field_id === f.id); return v && v.valor && v.valor.trim() !== ""; })
                    .map((f) => (
                      <div key={f.id}>
                        <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{f.etiqueta}</dt>
                        <dd className="text-sm text-gray-800 font-medium">{opCustomValues.find((cv) => cv.field_id === f.id)?.valor}</dd>
                      </div>
                    ))}
                </dl>
              );
            })()}
          </div>

          {/* Admin form */}
          <AdminOpForm
            opId={op.id}
            pipelineKey={op.pipeline_key}
            initialFase={op.fase ?? "Pre-análisis"}
            initialStatus={op.status}
            initialComisionColab={op.comision_colaborador}
            initialComisionColabPct={op.comision_colaborador_pct ?? null}
            initialComisionBegreat={op.comision_begreat}
            initialComisionBegreatPct={op.comision_begreat_pct ?? null}
            initialComisionOrigenes={(op.comision_origenes as any) ?? []}
            initialFacturaDestinatario={op.factura_destinatario ?? null}
            clientNombre={op.client_nombre ?? null}
            supplierNombre={op.supplier_nombre ?? null}
            colaboradorNombre={op.colaborador_nombre ?? null}
            colaboradorId={op.colaborador_id ?? null}
            initialColaboradores={(op.colaboradores_comision as any) ?? []}
            initialMargenPct={op.margen_pct ?? null}
            initialHoldedInvoiceId={op.holded_invoice_id ?? null}
            initialHoldedInvoiceNumber={op.holded_invoice_number ?? null}
            initialEntidad={op.entidad_financiera}
            initialEntityOfficeId={op.entity_office_id ?? null}
            initialHonorarios={op.honorarios_firmado}
            initialNotasAdmin={op.notas_admin ?? null}
            initialFacturacionRenting={op.facturacion_renting ?? null}
            initialEsRenovacion={op.es_renovacion ?? false}
            initialOpOriginal={opOriginal}
            initialOnedriveUrl={op.onedrive_url ?? null}
            initialNombre={op.nombre ?? null}
            initialDescripcion={op.descripcion ?? null}
            initialImporte={op.importe ?? null}
            initialProducto={op.producto ?? null}
            initialPlazoMeses={op.plazo_meses ?? null}
            initialFechaContrato={op.fecha_contrato ? new Date(op.fecha_contrato).toISOString().split("T")[0] : null}
            initialFechaFinContrato={op.fecha_fin_contrato ? new Date(op.fecha_fin_contrato).toISOString().split("T")[0] : null}
            initialCreatedAt={new Date(op.created_at).toISOString().split("T")[0]}
            initialFechaCierre={op.fecha_cierre ? new Date(op.fecha_cierre).toISOString().split("T")[0] : null}
            initialLugarEntrega={op.lugar_entrega ?? null}
            initialEquipoTipo={op.equipo_tipo ?? null}
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
            initialAvalistas={avalistasList.map(a => ({
              key: a.key, tipo: a.tipo, nombre: a.nombre, email: a.email ?? "", telefono: a.telefono ?? "",
              persona_contacto: a.persona_contacto ?? "", dni: a.dni ?? "", empresa: a.empresa ?? "",
              contact_id: a.contact_id, client_id: a.client_id,
              cif: "", direccion: "", cnae: "", web: "",
            }))}
            initialModalidadRenting={op.modalidad_renting ?? null}
            initialCuotaAproxMin={op.cuota_aproximada_min ?? null}
            initialCuotaAproxMax={op.cuota_aproximada_max ?? null}
            initialCuotaDefinitiva={op.cuota_definitiva ?? null}
            initialImporteFacturadoBegreat={op.importe_facturado_begreat ?? null}
            initialImporteFacturadoVisible={op.importe_facturado_visible ?? false}
            initialEntidadDestino={op.entidad_destino ?? null}
            initialEntidadVisible={op.entidad_visible ?? true}
            allEntities={allEntities}
            allOffices={allOffices}
            allColaboradores={allColaboradores}
            customFieldDefs={opCustomFields}
            customFieldValues={opCustomValues.map((v) => ({ field_id: v.field_id, valor: v.valor ?? null }))}
          />
        </div>

        {/* Tasks + Notes + Docs */}
        <div className="col-span-2 flex flex-col gap-5">
        <TasksSection
          initialTasks={opTasks.map(t => ({ ...t, created_at: t.created_at.toISOString(), completed_at: t.completed_at?.toISOString() ?? null, fecha_programada: t.fecha_programada?.toISOString() ?? null }))}
          operationId={id}
          assignees={taskAssignees}
          canSendReminders
        />

        <NotesSection
          notes={opNotes}
          apiUrl={`/api/operations/${id}/notes`}
          currentUserId={adminId}
          isAdmin={true}
          canPin
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
            title={`Documentación del cliente — ${op.client_nombre ?? "Cliente"}`}
            oneDriveFolder={clientFolder}
            canDelete
          />
        )}

        {avalistasList.map((av, avIdx) => (
          <DocumentsSection
            key={av.key}
            docs={avalDocs.filter(d => d.avalista_key === av.key || (avIdx === 0 && !d.avalista_key))}
            apiUrl={`/api/operations/${id}/aval-documents?avalista=${encodeURIComponent(av.key)}`}
            title={`Documentación del avalista ${avIdx + 1} — ${av.nombre}`}
            oneDriveFolder={`${opFolder}/Avalista ${avIdx + 1} - ${sanitizeFolderName(av.nombre)}`}
            canDelete
          />
        ))}

        <DocumentsSection docs={opDocs} operationId={id} title="Documentación de la operación" oneDriveFolder={opFolder} canDelete />
        </div>
      </div>
    </div>
  );
}
