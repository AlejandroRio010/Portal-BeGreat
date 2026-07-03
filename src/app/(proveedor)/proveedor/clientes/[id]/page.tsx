import { auth } from "@/lib/auth";
import { db } from "@/db";
import { avalClientCond } from "@/lib/avalistas";
import { clients, contacts, operations, suppliers, collaborators, clientNotes, customFields, customFieldValues, clientDocuments, operationDocuments, avalDocuments, docChecklistTemplates, docChecklistCustomItems, docChecklistEntries, entityTasks } from "@/db/schema";
import ClienteEditFormPortal from "./ClienteEditFormPortal";
import NuevoContactoForm from "./NuevoContactoForm";
import NotesSection from "@/components/NotesSection";
import DocumentsSection from "@/components/DocumentsSection";
import DocChecklistPanel from "@/components/DocChecklistPanel";
import EntityTasksSection from "@/components/EntityTasksSection";
import { eq, and, asc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCnaeByCode } from "@/lib/cnaes";
import { fmtEur } from "@/lib/format";
import { clientFolderPath } from "@/lib/onedrive";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  pendiente_de_validar: { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" },
  activa:               { bg: "bg-blue-50 text-blue-700 border border-blue-200",    label: "En curso" },
  archivada:            { bg: "bg-gray-100 text-gray-500 border border-gray-200",   label: "Archivada" },
};

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).supplierId as string;

  // Verify this client belongs to an operation of this supplier
  const [supplierOp] = await db
    .select({ id: operations.id })
    .from(operations)
    .where(and(eq(operations.client_id, id), eq(operations.supplier_id, userId)))
    .limit(1);

  if (!supplierOp) notFound();

  const [client] = await db
    .select({
      id: clients.id,
      nombre: clients.nombre,
      cif: clients.cif,
      email: clients.email,
      telefono: clients.telefono,
      web: clients.web,
      linkedin: clients.linkedin,
      nombre_comercial: clients.nombre_comercial,
      direccion: clients.direccion,
      cnae: clients.cnae,
      grupo_empresarial: clients.grupo_empresarial,
      group_id: clients.group_id,
      codigo: clients.codigo,
      created_at: clients.created_at,
    })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);

  if (!client) notFound();

  const [supplierInfo] = await db
    .select({ nombre: suppliers.nombre })
    .from(suppliers)
    .where(eq(suppliers.id, userId))
    .limit(1);

  const puedeEditar = true; // Suppliers can edit their clients

  const clientContacts = await db.select().from(contacts).where(eq(contacts.client_id, id)).orderBy(contacts.nombre);

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      entidad_financiera: operations.entidad_financiera,
      created_at: operations.created_at,
      tiene_aval: operations.tiene_aval,
      aval_tipo: operations.aval_tipo,
      aval_nombre: operations.aval_nombre,
      aval_email: operations.aval_email,
      aval_telefono: operations.aval_telefono,
      aval_persona_contacto: operations.aval_persona_contacto,
      aval_contact_id: operations.aval_contact_id,
      aval_client_id: operations.aval_client_id,
    })
    .from(operations)
    .where(and(eq(operations.client_id, id), eq(operations.supplier_id, userId)))
    .orderBy(operations.created_at);

  const clienteCustomFields = await db.select().from(customFields).where(eq(customFields.entidad, "cliente")).orderBy(asc(customFields.orden));
  const clienteCustomValues = await db.select().from(customFieldValues).where(eq(customFieldValues.entity_id, id));
  const notes = await db.select().from(clientNotes).where(eq(clientNotes.client_id, id)).orderBy(clientNotes.created_at);
  const eTasks = await db.select().from(entityTasks).where(and(eq(entityTasks.entity_type, "cliente"), eq(entityTasks.entity_id, id))).orderBy(entityTasks.created_at);
  const adminsForTasks = await db.select({ id: collaborators.id, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.role, "admin"));
  const docs = await db.select().from(clientDocuments).where(eq(clientDocuments.client_id, id)).orderBy(clientDocuments.created_at);

  const opIds = ops.map(o => o.id);
  const opDocsAll = opIds.length > 0
    ? await db.select().from(operationDocuments).where(inArray(operationDocuments.operation_id, opIds)).orderBy(operationDocuments.created_at)
    : [];
  const opDocsMap = new Map<string, typeof opDocsAll>();
  for (const d of opDocsAll) {
    const arr = opDocsMap.get(d.operation_id) ?? [];
    arr.push(d);
    opDocsMap.set(d.operation_id, arr);
  }

  const docTemplates = await db.select().from(docChecklistTemplates).orderBy(asc(docChecklistTemplates.orden));
  const docCustomItems = await db.select().from(docChecklistCustomItems).where(and(eq(docChecklistCustomItems.entity_type, "cliente"), eq(docChecklistCustomItems.entity_id, id))).orderBy(asc(docChecklistCustomItems.orden));
  const docEntries = await db.select().from(docChecklistEntries).where(and(eq(docChecklistEntries.entity_type, "cliente"), eq(docChecklistEntries.entity_id, id)));

  const opsAvaladoras = await db.select({
    id: operations.id,
    nombre: operations.nombre,
    pipeline_key: operations.pipeline_key,
    fase: operations.fase,
    status: operations.status,
    importe: operations.importe,
    created_at: operations.created_at,
    client_nombre: clients.nombre,
  }).from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(avalClientCond(id), eq(operations.supplier_id, userId)))
    .orderBy(operations.created_at);

  const FASES_APROBADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

  const opsAprobadas = ops.filter(o => FASES_APROBADAS.includes(o.fase));
  const opsEstudio = ops.filter(o => o.status === "activa" && !FASES_APROBADAS.includes(o.fase));
  const totalFinanciado = opsAprobadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const totalPendiente = opsEstudio.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  const inicial = client.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/proveedor/clientes" className="hover:text-[#2E1A47] font-medium">Mis clientes</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{client.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none">
            {inicial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{client.nombre}</p>
              {client.codigo && <span className="text-[10px] font-bold font-mono bg-white/20 text-white px-2 py-0.5 tracking-wider">{client.codigo}</span>}
            </div>
            {client.cif && <p className="text-white/60 text-xs mt-0.5 font-mono">{client.cif}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-white/70 text-xs">Proveedor: <span className="text-white font-semibold">{supplierInfo?.nombre}</span></span>
          <span className="text-white/50 text-xs">Alta: {fmtDate(client.created_at)}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops firmadas</p>
            <p className="text-white text-3xl font-black">{opsAprobadas.length}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">de {ops.length} totales</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
            <p className="text-white text-2xl font-black leading-tight">{totalFinanciado > 0 ? fmtEur(String(totalFinanciado)) : "—"}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">importe acumulado</p>
          </div>
        </div>
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5 border-r border-white/15">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ops en estudio</p>
            <p className="text-white text-3xl font-black">{opsEstudio.length}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">pendientes de aprobar</p>
          </div>
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación pendiente</p>
            <p className="text-white text-2xl font-black leading-tight">{totalPendiente > 0 ? fmtEur(String(totalPendiente)) : "—"}</p>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">en proceso</p>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: Datos + Contactos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["Nombre", client.nombre],
                ["CIF", client.cif],
                ["Dirección", client.direccion],
                ["CNAE", client.cnae ? (getCnaeByCode(client.cnae) ? `${getCnaeByCode(client.cnae)!.codigo} — ${getCnaeByCode(client.cnae)!.titulo}` : client.cnae) : null],
                ["Web", client.web],
                ["Email", client.email],
                ["Teléfono", client.telefono],
                ["LinkedIn", client.linkedin],
                ...clienteCustomFields
                  .filter(f => { const v = clienteCustomValues.find(cv => cv.field_id === f.id); return v && v.valor && v.valor.trim() !== ""; })
                  .map(f => [f.etiqueta, clienteCustomValues.find(cv => cv.field_id === f.id)?.valor ?? null] as [string, string | null]),
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "LinkedIn" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-semibold">LinkedIn →</a>
                    ) : label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                    )}
                  </div>
                ) : null
              )}
              {client.grupo_empresarial && (
                <div className="py-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Grupo empresarial</span>
                  {client.group_id
                    ? <Link href={`/proveedor/grupos/${client.group_id}`} className="text-sm text-[#2E1A47] font-semibold hover:underline">{client.grupo_empresarial} →</Link>
                    : <span className="text-sm text-gray-800 font-medium">{client.grupo_empresarial}</span>}
                </div>
              )}
            </div>
            {puedeEditar && (
              <div className="px-5 pb-4">
                <ClienteEditFormPortal client={{
                  id, nombre: client.nombre, cif: client.cif ?? null, email: client.email ?? null,
                  telefono: client.telefono ?? null, web: client.web ?? null, linkedin: client.linkedin ?? null,
                  nombre_comercial: client.nombre_comercial ?? null, direccion: client.direccion ?? null,
                  cnae: client.cnae ?? null, grupo_empresarial: client.grupo_empresarial ?? null,
                }} />
              </div>
            )}
          </div>

          {/* Contactos */}
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contactos ({clientContacts.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {clientContacts.map(c => (
                <Link key={c.id} href={`/proveedor/clientes/${id}/contactos/${c.id}`} className="block px-5 py-3 hover:bg-[#EEEBF3]/30 transition-colors group">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{c.nombre}</p>
                  {c.rol && <p className="text-xs text-gray-400">{c.rol}</p>}
                  {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                  {c.telefono && <p className="text-xs text-gray-500">{c.telefono}</p>}
                </Link>
              ))}
            </div>
            {puedeEditar && <div className="px-5 py-4"><NuevoContactoForm clientId={id} /></div>}
          </div>

          <DocChecklistPanel entityType="cliente" entityId={id} templates={docTemplates} customItems={docCustomItems} entries={docEntries} />
        </div>

        {/* Col 2-3: Operaciones + Notas */}
        <div className="col-span-2 flex flex-col gap-6 min-w-0">
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones</h3>
            </div>
            {ops.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin operaciones registradas para este cliente.</p>
            ) : (
              <div style={{ zoom: 0.82 }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fase</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ops.map(op => {
                    const FASES_GANADAS = ["Honorarios pagados", "Transferencia realizada"];
                    const badge = FASES_GANADAS.includes(op.fase)
                      ? { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Ganada ✓" }
                      : op.status === "archivada"
                        ? { bg: "bg-red-50 text-red-600 border border-red-200", label: "Denegada" }
                        : op.status === "pendiente_de_validar"
                          ? { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" }
                          : { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "En curso" };
                    return (
                      <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-800 font-medium max-w-[160px] truncate">{op.nombre ?? "—"}</td>
                        <td className="px-5 py-3 text-xs">
                          <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                            {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 max-w-[120px] truncate">{op.fase}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-medium">{fmtEur(op.importe)}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(op.created_at)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <Link href={`/proveedor/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Avalistas vinculados */}
          {(() => {
            const opsConAval = ops.filter(o => o.tiene_aval && o.aval_nombre);
            const avalistasMap = new Map<string, typeof opsConAval[0]>();
            opsConAval.forEach(o => { if (!avalistasMap.has(o.aval_nombre!)) avalistasMap.set(o.aval_nombre!, o); });
            const avalistas = Array.from(avalistasMap.values());
            if (avalistas.length === 0) return null;
            return (
              <div className="bg-white border border-gray-200 p-5">
                <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
                  Avalistas vinculados ({avalistas.length})
                </p>
                <div className="space-y-3">
                  {avalistas.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          a.aval_tipo === "empresa" ? "bg-[#2E1A47] text-white" : "bg-amber-100 text-amber-700"
                        }`}>
                          {a.aval_tipo === "empresa" ? "E" : "P"}
                        </div>
                        <div>
                          {a.aval_contact_id ? (
                            <Link href={`/proveedor/clientes/${id}/contactos/${a.aval_contact_id}`} className="text-sm font-semibold text-[#2E1A47] hover:underline">{a.aval_nombre}</Link>
                          ) : a.aval_client_id ? (
                            <Link href={`/proveedor/clientes/${a.aval_client_id}`} className="text-sm font-semibold text-[#2E1A47] hover:underline">{a.aval_nombre}</Link>
                          ) : (
                            <p className="text-sm font-semibold text-gray-800">{a.aval_nombre}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 uppercase">{a.aval_tipo === "empresa" ? "Empresa" : "Persona física"}</span>
                            {a.aval_email && <><span className="text-[10px] text-gray-300">·</span><span className="text-[10px] text-gray-400">{a.aval_email}</span></>}
                            {a.aval_telefono && <><span className="text-[10px] text-gray-300">·</span><span className="text-[10px] text-gray-400">{a.aval_telefono}</span></>}
                          </div>
                        </div>
                      </div>
                      <Link href={`/proveedor/operaciones/${a.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline flex-shrink-0">
                        Ver op →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {opsAvaladoras.length > 0 && (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones avaladas por esta empresa ({opsAvaladoras.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {opsAvaladoras.map(op => (
                  <Link key={op.id} href={`/proveedor/operaciones/${op.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#EEEBF3]/30 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{op.nombre ?? "—"}</p>
                      <p className="text-xs text-gray-400">{op.client_nombre} · {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"} · {op.fase} · {fmtEur(op.importe)}</p>
                    </div>
                    <span className="text-xs text-[#2E1A47] font-semibold flex-shrink-0">Ver →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <EntityTasksSection
            initialTasks={eTasks.map(t => ({ ...t, created_at: t.created_at.toISOString(), completed_at: t.completed_at?.toISOString() ?? null, fecha_programada: t.fecha_programada?.toISOString() ?? null }))}
            apiUrl={`/api/entity-tasks/cliente/${id}`}
            assignees={[{ id: userId, nombre: supplierInfo?.nombre ?? "Proveedor" }, ...adminsForTasks]}
          />

          <NotesSection
            notes={notes}
            apiUrl={`/api/proveedor/clientes/${id}/notes`}
            currentUserId={userId}
            canPin
            placeholder="Añade una nota general sobre este cliente..."
          />

          <DocumentsSection docs={docs} apiUrl={`/api/clientes/${id}/documents`} title={`Documentación de ${client.nombre}`} oneDriveFolder={clientFolderPath(client.nombre)} />

          {ops.filter(o => (opDocsMap.get(o.id) ?? []).length > 0).length > 0 && (
            <div className="bg-white border border-gray-200 p-5">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
                Documentación de operaciones ({ops.filter(o => (opDocsMap.get(o.id) ?? []).length > 0).length})
              </p>
              <div className="space-y-4">
                {ops.filter(o => (opDocsMap.get(o.id) ?? []).length > 0).map(o => (
                  <div key={o.id} className="border border-gray-200">
                    <div className="bg-[#EEEBF3] px-4 py-2.5 flex items-center justify-between">
                      <Link href={`/proveedor/operaciones/${o.id}`} className="text-xs font-bold text-[#2E1A47] hover:underline">{o.nombre ?? "Sin nombre"}</Link>
                      <span className="text-[10px] text-gray-400">{(opDocsMap.get(o.id) ?? []).length} docs</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {(opDocsMap.get(o.id) ?? []).map(d => (
                        <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-lg flex-shrink-0">📄</span>
                            <div className="min-w-0">
                              <a href={`/api/download?docId=${d.id}`} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-semibold text-gray-800 hover:text-[#2E1A47] hover:underline truncate block">
                                {d.filename}
                              </a>
                              <div className="flex items-center gap-2 mt-0.5">
                                {d.size && <span className="text-[10px] text-gray-400">{d.size < 1024 * 1024 ? `${(d.size / 1024).toFixed(0)} KB` : `${(d.size / (1024 * 1024)).toFixed(1)} MB`}</span>}
                                <span className="text-[10px] text-gray-400">·</span>
                                <span className="text-[10px] text-gray-400">{d.uploaded_by}</span>
                                <span className="text-[10px] text-gray-400">·</span>
                                <span className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
