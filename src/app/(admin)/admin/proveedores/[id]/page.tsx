import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers, collaborators, operations, clients, docChecklistTemplates, docChecklistCustomItems, docChecklistEntries, supplierNotes, supplierDocuments, entityTasks } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProveedorEditForm from "./ProveedorEditForm";
import SupplierPortalToggle from "./SupplierPortalToggle";
import SupplierUsuariosPanel from "./SupplierUsuariosPanel";
import AsignarResponsable from "@/components/AsignarResponsable";
import DocChecklistPanel from "@/components/DocChecklistPanel";
import DocumentsSection from "@/components/DocumentsSection";
import NotesSection from "@/components/NotesSection";
import EntityTasksSection from "@/components/EntityTasksSection";
import { fmtEur } from "@/lib/format";
import { sanitizeFolderName } from "@/lib/onedrive";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

const FASES_GANADAS = ["Honorarios pagados", "Transferencia realizada"];

function opBadge(op: { status: string; fase: string | null }) {
  if (FASES_GANADAS.includes(op.fase ?? ""))
    return { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Ganada ✓" };
  if (op.status === "archivada")
    return { bg: "bg-red-50 text-red-600 border border-red-200", label: "Denegada" };
  if (op.status === "pendiente_de_validar")
    return { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" };
  return { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "En curso" };
}

export default async function ProveedorFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const adminUserId = session?.user?.id as string;

  const [prov] = await db
    .select({
      id: suppliers.id,
      nombre: suppliers.nombre,
      email: suppliers.email,
      telefono: suppliers.telefono,
      web: suppliers.web,
      cif: suppliers.cif,
      cnae: suppliers.cnae,
      direccion: suppliers.direccion,
      provincia: suppliers.provincia,
      nombre_comercial: suppliers.nombre_comercial,
      persona_contacto: suppliers.persona_contacto,
      contacto_email: suppliers.contacto_email,
      contacto_telefono: suppliers.contacto_telefono,
      codigo: suppliers.codigo,
      portal_activo: suppliers.portal_activo,
      puede_ver_entidades: suppliers.puede_ver_entidades,
      created_at: suppliers.created_at,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
    })
    .from(suppliers)
    .leftJoin(collaborators, eq(suppliers.collaborator_id, collaborators.id))
    .where(eq(suppliers.id, id))
    .limit(1);

  if (!prov) notFound();

  const docTemplates = await db.select().from(docChecklistTemplates).orderBy(asc(docChecklistTemplates.orden));
  const docCustomItems = await db.select().from(docChecklistCustomItems).where(and(eq(docChecklistCustomItems.entity_type, "proveedor"), eq(docChecklistCustomItems.entity_id, id))).orderBy(asc(docChecklistCustomItems.orden));
  const docEntries = await db.select().from(docChecklistEntries).where(and(eq(docChecklistEntries.entity_type, "proveedor"), eq(docChecklistEntries.entity_id, id)));

  const notes = await db.select().from(supplierNotes).where(eq(supplierNotes.supplier_id, id)).orderBy(supplierNotes.created_at);
  const eTasks = await db.select().from(entityTasks).where(and(eq(entityTasks.entity_type, "proveedor"), eq(entityTasks.entity_id, id))).orderBy(entityTasks.created_at);
  const adminsForTasks = await db.select({ id: collaborators.id, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.role, "admin"));

  const docs = await db.select().from(supplierDocuments).where(eq(supplierDocuments.supplier_id, id)).orderBy(supplierDocuments.created_at);

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_begreat: operations.comision_begreat,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.supplier_id, id))
    .orderBy(operations.created_at);

  const inicial = prov.nombre.charAt(0).toUpperCase();
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/proveedores" className="hover:text-[#2E1A47] font-medium">Proveedores</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{prov.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none">
            {inicial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{prov.nombre}</p>
              {prov.codigo && <span className="text-[10px] font-bold font-mono bg-white/20 text-white px-2 py-0.5 tracking-wider">{prov.codigo}</span>}
            </div>
            {prov.web && <p className="text-white/50 text-xs mt-0.5">{prov.web}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="text-white/70 text-xs flex items-center gap-1">
            Responsable: <AsignarResponsable currentId={prov.colaborador_id} currentNombre={prov.colaborador_nombre} patchUrl={`/api/admin/proveedores/${prov.id}`} />
          </div>
          <span className="text-white/50 text-xs">Alta: {fmtDate(prov.created_at)}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 flex overflow-hidden">
        <div className="flex-1 bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Operaciones</p>
          <p className="text-white text-3xl font-black">{ops.length}</p>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex-1 bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Importe total</p>
          <p className="text-white text-3xl font-black">{totalImporte > 0 ? fmtEur(String(totalImporte)) : "—"}</p>
        </div>
      </div>

      {/* Portal access + Users */}
      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        <SupplierPortalToggle supplierId={prov.id} portalActivo={prov.portal_activo} puedeVerEntidades={prov.puede_ver_entidades} />
        <SupplierUsuariosPanel supplierId={prov.id} portalActivo={prov.portal_activo} contacto={{ nombre: prov.persona_contacto ?? null, email: prov.contacto_email ?? null, telefono: prov.contacto_telefono ?? null }} />
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Datos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos del proveedor</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["CIF", prov.cif],
                ["Nombre comercial", prov.nombre_comercial],
                ["Email", prov.email],
                ["Teléfono", prov.telefono],
                ["Web", prov.web],
                ["CNAE", prov.cnae],
                ["Provincia", prov.provincia],
                ["Dirección", prov.direccion],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    )}
                  </div>
                ) : null
              )}
            </div>
            <div className="px-5 pb-4">
              <ProveedorEditForm proveedor={{ id: prov.id, nombre: prov.nombre, email: prov.email ?? null, telefono: prov.telefono ?? null, web: prov.web ?? null, cif: prov.cif ?? null, cnae: prov.cnae ?? null, direccion: prov.direccion ?? null, provincia: prov.provincia ?? null, nombre_comercial: prov.nombre_comercial ?? null, persona_contacto: prov.persona_contacto ?? null, contacto_email: prov.contacto_email ?? null, contacto_telefono: prov.contacto_telefono ?? null }} />
            </div>
          </div>

          {(prov.persona_contacto || prov.contacto_email || prov.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Persona de contacto</h3>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {[
                  ["Nombre", prov.persona_contacto],
                  ["Email", prov.contacto_email],
                  ["Teléfono", prov.contacto_telefono],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="py-2.5 flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          <DocChecklistPanel entityType="proveedor" entityId={id} templates={docTemplates} customItems={docCustomItems} entries={docEntries} />

          <DocumentsSection docs={docs} apiUrl={`/api/admin/proveedores/${id}/documents`} oneDriveFolder={sanitizeFolderName(prov.nombre)} />
        </div>

        {/* Operaciones + Notas */}
        <div className="col-span-2 flex flex-col gap-6 min-w-0">
        <div className="bg-white border border-gray-200">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones asociadas</h3>
          </div>
          {ops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin operaciones asociadas a este proveedor.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map((op) => {
                  const badge = opBadge(op);
                  return (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">{op.nombre ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 max-w-[120px] truncate">{op.client_nombre ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                        {op.pipeline_key === "renting" ? "Renting" : "Consultoría"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{fmtEur(op.importe)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(op.created_at)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

          <EntityTasksSection
            initialTasks={eTasks.map(t => ({ ...t, created_at: t.created_at.toISOString(), completed_at: t.completed_at?.toISOString() ?? null, fecha_programada: t.fecha_programada?.toISOString() ?? null }))}
            apiUrl={`/api/entity-tasks/proveedor/${id}`}
            assignees={adminsForTasks}
          />

          <NotesSection
            notes={notes}
            apiUrl={`/api/admin/proveedores/${id}/notes`}
            placeholder="Añade una nota sobre este proveedor..."
            isAdmin={true}
            currentUserId={adminUserId}
            canPin
          />
        </div>
      </div>
    </div>
  );
}
