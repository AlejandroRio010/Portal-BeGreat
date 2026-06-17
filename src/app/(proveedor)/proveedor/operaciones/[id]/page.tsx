import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, notes, operationDocuments, clientDocuments, avalDocuments, contacts, infoRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import { fmtEur, fmtNum } from "@/lib/format";
import OpResultadoPanel from "./OpResultadoPanel";
import DocumentsSection from "@/components/DocumentsSection";
import InfoRequestsSection from "@/components/InfoRequestsSection";
import { sanitizeFolderName } from "@/lib/onedrive";

const FASES_RENTING = ["Pre-análisis","En estudio por entidad","Operación aprobada","Condiciones aceptadas","Contrato firmado","Transferencia realizada"];
const FASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Pre-análisis":             { bg: "bg-gray-100",     text: "text-gray-600",    border: "border-gray-200" },
  "En estudio por entidad":   { bg: "bg-amber-50",     text: "text-amber-700",   border: "border-amber-200" },
  "Operación aprobada":       { bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-200" },
  "Condiciones aceptadas":    { bg: "bg-teal-50",      text: "text-teal-700",    border: "border-teal-200" },
  "Contrato firmado":         { bg: "bg-violet-50",    text: "text-violet-700",  border: "border-violet-200" },
  "Transferencia realizada":  { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
};

export default async function ProveedorOperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor") notFound();
  const supplierId = (session.user as any).supplierId as string;

  const [supplier] = await db
    .select({ puede_ver_entidades: suppliers.puede_ver_entidades })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  const [op] = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      codigo: operations.codigo,
      pipeline_key: operations.pipeline_key,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      descripcion: operations.descripcion,
      lugar_entrega: operations.lugar_entrega,
      plazo_meses: operations.plazo_meses,
      equipo_tipo: operations.equipo_tipo,
      motivo_denegacion: operations.motivo_denegacion,
      entidad_financiera: operations.entidad_financiera,
      entidad_destino: operations.entidad_destino,
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
      created_at: operations.created_at,
      client_id: operations.client_id,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(eq(operations.id, id), eq(operations.supplier_id, supplierId)))
    .limit(1);

  if (!op) notFound();

  const clienteContacto = op.client_id
    ? await db.select({ id: contacts.id, nombre: contacts.nombre }).from(contacts).where(eq(contacts.client_id, op.client_id)).limit(1).then(r => r[0] ?? null)
    : null;

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
  const opInfoRequests = await db.select().from(infoRequests).where(eq(infoRequests.operation_id, id)).orderBy(infoRequests.created_at);

  const clientFolder = sanitizeFolderName(op.client_nombre ?? "Sin cliente");
  const opFolder = `${clientFolder}/${sanitizeFolderName(op.codigo ?? id)}`;
  const avalFolder = `${opFolder}/Avalista`;

  const faseIdx = op.status === "pendiente_de_validar" ? -1 : FASES_RENTING.indexOf(op.fase ?? "");
  const faseStyle = op.fase ? (FASE_COLOR[op.fase] ?? FASE_COLOR["Pre-análisis"]) : FASE_COLOR["Pre-análisis"];

  const isPendiente = op.status === "pendiente_de_validar";
  const isArchivada = op.status === "archivada";
  const FASES_GANADAS = ["Honorarios pagados", "Transferencia realizada"];
  const isGanada = FASES_GANADAS.includes(op.fase ?? "");
  const isDenegada = isArchivada && !isGanada;

  const fmtFecha = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  const cuota = op.importe && op.plazo_meses ? `${fmtNum(Number(op.importe) / op.plazo_meses)} €/mes` : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href="/proveedor/operaciones/renting" className="hover:text-[#2E1A47] transition-colors">Funnel de renting</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{op.nombre ?? op.client_nombre ?? "Operación"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          {op.codigo && <span className="text-xs font-bold font-mono bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 tracking-wider">{op.codigo}</span>}
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{op.nombre ?? op.client_nombre ?? "Operación"}</h1>
          {op.nombre && op.client_nombre && <p className="text-sm text-gray-400 mt-0.5">{op.client_nombre}</p>}
          <p className="text-sm text-gray-400 mt-1">Renting de equipos</p>
        </div>
        {isPendiente ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pendiente de validar
          </span>
        ) : isDenegada ? (
          <span className="px-3 py-1.5 text-xs font-semibold border bg-red-50 border-red-200 text-red-600">Denegada</span>
        ) : isGanada ? (
          <span className="px-3 py-1.5 text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">Ganada ✓</span>
        ) : (
          <span className={`px-3 py-1.5 text-xs font-semibold border ${faseStyle.bg} ${faseStyle.text} ${faseStyle.border}`}>{op.fase}</span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#2E1A47] p-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Importe venta</p>
          <p className="text-2xl font-black text-white">{fmtEur(op.importe)}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Plazo</p>
          <p className="text-lg font-bold text-gray-800">{op.plazo_meses ? `${op.plazo_meses} meses` : "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Cuota estimada</p>
          <p className="text-lg font-bold text-gray-800">{cuota ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Fecha de alta</p>
          <p className="text-lg font-bold text-gray-800">
            {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!isPendiente && !isArchivada && (
        <div className="bg-white border border-gray-200 p-5 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Fase de la operación</p>
          <div className="flex items-center gap-0">
            {FASES_RENTING.map((fase, i) => {
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
                  {i < FASES_RENTING.length - 1 && (
                    <div className={`h-px flex-1 mx-1 -mt-5 ${i < faseIdx ? "bg-[#2E1A47]" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isPendiente && (
        <OpResultadoPanel
          opId={op.id}
          pipelineKey={op.pipeline_key}
          currentResultado={isGanada ? "ganada" : isDenegada ? "denegada" : "en_curso"}
          motivoDenegacion={op.motivo_denegacion ?? null}
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos de la operación</p>
            <dl className="space-y-3">
              {/* Specific field order for proveedor */}
              {op.client_nombre && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Empresa cliente</dt>
                  <dd className="text-sm font-medium">
                    {op.client_id
                      ? <Link href={`/proveedor/clientes/${op.client_id}`} className="text-[#2E1A47] hover:underline font-semibold">{op.client_nombre} →</Link>
                      : op.client_nombre}
                  </dd>
                </div>
              )}
              {clienteContacto && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Contacto</dt>
                  <dd className="text-sm font-medium">
                    <Link href={`/proveedor/clientes/${op.client_id}/contactos/${clienteContacto.id}`} className="text-[#2E1A47] hover:underline font-semibold">{clienteContacto.nombre} →</Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha de alta</dt>
                <dd className="text-sm text-gray-800 font-medium">{fmtFecha(op.created_at)}</dd>
              </div>
              {op.fecha_cierre && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha de cierre</dt>
                  <dd className="text-sm text-gray-800 font-medium">{fmtFecha(op.fecha_cierre)}</dd>
                </div>
              )}
              {op.equipo_tipo && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Tipo de equipo</dt>
                  <dd className="text-sm text-gray-800 font-medium capitalize">{op.equipo_tipo}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Importe venta proveedor (IVA no incl.)</dt>
                <dd className="text-sm text-gray-800 font-medium">{fmtEur(op.importe)}</dd>
              </div>
              {op.plazo_meses && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Plazo</dt>
                  <dd className="text-sm text-gray-800 font-medium">{op.plazo_meses} meses</dd>
                </div>
              )}
              {cuota && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Cuota estimada</dt>
                  <dd className="text-sm text-gray-800 font-medium">{cuota}</dd>
                </div>
              )}

              {/* Entidad — only if supplier can see */}
              {supplier?.puede_ver_entidades && op.entidad_financiera && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad que estudia</dt>
                  <dd className="text-sm text-gray-800 font-medium">{op.entidad_financiera}</dd>
                </div>
              )}
              {supplier?.puede_ver_entidades && op.entidad_destino && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Entidad destino</dt>
                  <dd className="text-sm text-gray-800 font-medium">{op.entidad_destino}</dd>
                </div>
              )}

              {op.lugar_entrega && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Lugar de instalación</dt>
                  <dd className="text-sm text-gray-800 font-medium">{op.lugar_entrega}</dd>
                </div>
              )}

              {/* Aval — identical to other roles */}
              {op.tiene_aval && op.aval_tipo && (
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                    {op.aval_tipo === "persona_fisica" ? "Avalista (persona física)" : "Avalista (empresa)"}
                  </dt>
                  {op.aval_tipo === "persona_fisica" ? (
                    <dd className="text-sm text-gray-800">
                      {op.aval_contact_id ? (
                        <Link href={`/proveedor/clientes/${avalContactData?.client_id ?? op.client_id}/contactos/${op.aval_contact_id}`} className="font-medium text-[#2E1A47] hover:underline">{op.aval_nombre}</Link>
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
                        <Link href={`/proveedor/clientes/${op.aval_client_id}`} className="font-medium text-[#2E1A47] hover:underline">{op.aval_nombre}</Link>
                      ) : (
                        <p className="font-medium">{op.aval_nombre}</p>
                      )}
                      {op.aval_persona_contacto && <p className="text-xs text-gray-500">Contacto: {op.aval_persona_contacto}</p>}
                      {op.aval_email && <p className="text-xs text-gray-500">{op.aval_email}</p>}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-5">
          <NotesSection
            notes={opNotes}
            apiUrl={`/api/proveedor/operations/${id}/notes`}
            currentUserId={supplierId}
            canPin
            placeholder="Añade una nota sobre esta operación..."
          />

          {op.descripcion && (
            <div className="bg-white border border-gray-200 p-5">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-3 pb-3 border-b border-gray-100">Descripción del equipo</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{op.descripcion}</p>
            </div>
          )}

          {opInfoRequests.length > 0 && (
            <InfoRequestsSection
              requests={opInfoRequests}
              apiUrl={`/api/operations/${id}/requests`}
              isAdmin={false}
            />
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
