import { db } from "@/db";
import { clientGroups, clients, operations, clientGroupContacts, collaborators, clientGroupNotes, entityTasks } from "@/db/schema";
import { eq, isNull, inArray, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EmpresasGrupoPanel from "./EmpresasGrupoPanel";
import ContactosGrupoPanel from "@/components/ContactosGrupoPanel";
import GrupoColaboradorSelector from "./GrupoColaboradorSelector";
import NotesSection from "@/components/NotesSection";
import EntityTasksSection from "@/components/EntityTasksSection";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function AdminGrupoFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [grupo] = await db.select().from(clientGroups).where(eq(clientGroups.id, id)).limit(1);
  if (!grupo) notFound();

  const empresas = await db
    .select({ id: clients.id, nombre: clients.nombre, codigo: clients.codigo, cif: clients.cif })
    .from(clients).where(eq(clients.group_id, id)).orderBy(clients.nombre);

  // Empresas sin grupo (disponibles para asignar)
  const disponibles = await db
    .select({ id: clients.id, nombre: clients.nombre, codigo: clients.codigo, cif: clients.cif })
    .from(clients).where(isNull(clients.group_id)).orderBy(clients.nombre);

  const contactosGrupo = await db.select().from(clientGroupContacts).where(eq(clientGroupContacts.group_id, id)).orderBy(clientGroupContacts.created_at);

  const allColabs = await db.select({ id: collaborators.id, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.activo, true)).orderBy(collaborators.nombre);
  const grupoNotes = await db.select().from(clientGroupNotes).where(eq(clientGroupNotes.group_id, id)).orderBy(clientGroupNotes.created_at);
  const eTasks = await db.select().from(entityTasks).where(and(eq(entityTasks.entity_type, "grupo"), eq(entityTasks.entity_id, id))).orderBy(entityTasks.created_at);

  // Métricas + listado completo de ops
  const empresaIds = empresas.map(e => e.id);
  const ops = empresaIds.length > 0
    ? await db.select({
        id: operations.id,
        nombre: operations.nombre,
        pipeline_key: operations.pipeline_key,
        fase: operations.fase,
        status: operations.status,
        importe: operations.importe,
        comision_begreat: operations.comision_begreat,
        comision_colaborador: operations.comision_colaborador,
        fecha_cierre: operations.fecha_cierre,
        created_at: operations.created_at,
        client_nombre: clients.nombre,
      }).from(operations)
        .leftJoin(clients, eq(operations.client_id, clients.id))
        .where(inArray(operations.client_id, empresaIds))
        .orderBy(operations.fecha_cierre, operations.created_at)
    : [];

  const firmadas = ops.filter(o => FIRMADAS.includes(o.fase ?? ""));
  const totalFinanciado = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const feeBegreat = firmadas.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);

  function fmtFecha(d: Date | null | undefined) {
    if (!d) return "—";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
  }

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/grupos" className="hover:text-[#2E1A47] font-medium">Grupos empresariales</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{grupo.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{grupo.nombre.charAt(0)}</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{grupo.nombre}</p>
              {grupo.codigo && <span className="text-[10px] font-bold font-mono bg-white/20 text-white px-2 py-0.5 tracking-wider">{grupo.codigo}</span>}
            </div>
            {grupo.web && <a href={grupo.web} target="_blank" rel="noopener noreferrer" className="text-white/50 text-xs hover:text-white/80 mt-0.5 block">{grupo.web.replace(/^https?:\/\//, "")}</a>}
          </div>
        </div>
        <span className="text-white/50 text-xs">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</span>
      </div>

      {/* KPIs */}
      <div className="mx-8 mb-6 grid grid-cols-3 gap-4">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Empresas</p>
          <p className="text-3xl font-black text-white">{empresas.length}</p>
        </div>
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
          <p className="text-2xl font-black text-white leading-tight">{totalFinanciado > 0 ? fmtEur(totalFinanciado) : "—"}</p>
        </div>
        <div className="bg-[#EEEBF3] border border-[#EEEBF3] px-6 py-5">
          <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Fee BeGreat acumulada</p>
          <p className="text-2xl font-black text-[#2E1A47] leading-tight">{feeBegreat > 0 ? fmtEur(feeBegreat) : "—"}</p>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Datos del grupo + contactos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200"><h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos del grupo</h3></div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {([["Nombre", grupo.nombre], ["CIF matriz", grupo.cif_matriz], ["Web", grupo.web], ["Descripción", grupo.descripcion]] as [string, string | null][]).map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Web" ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                      : <span className="text-sm text-gray-800 font-medium">{value}</span>}
                  </div>
                ) : null
              )}
              <GrupoColaboradorSelector grupoId={id} grupoNombre={grupo.nombre} currentCollaboratorId={grupo.collaborator_id} colaboradores={allColabs} />
            </div>
          </div>
          <ContactosGrupoPanel contactos={contactosGrupo} groupId={id} />
        </div>

        {/* Empresas + Notas */}
        <div className="col-span-2 flex flex-col gap-4">
          <EmpresasGrupoPanel grupoId={id} empresas={empresas} disponibles={disponibles} />
          <EntityTasksSection
            initialTasks={eTasks.map(t => ({ ...t, created_at: t.created_at.toISOString(), completed_at: t.completed_at?.toISOString() ?? null, fecha_programada: t.fecha_programada?.toISOString() ?? null }))}
            apiUrl={`/api/entity-tasks/grupo/${id}`}
            assignees={allColabs.map(c => ({ id: c.id, nombre: c.nombre }))}
          />
          <NotesSection notes={grupoNotes} apiUrl={`/api/admin/grupos/${id}/notes`} isAdmin canPin />
        </div>
      </div>

      {/* Operaciones del grupo */}
      <div className="mx-8 mb-8">
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones del grupo ({ops.length})</h3>
          </div>
          {ops.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin operaciones registradas para las empresas de este grupo.</p>
          ) : (
            <div style={{ zoom: 0.9 }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operación</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee BeGreat</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee Colaborador</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha cierre</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map(op => {
                  const badge = op.status === "archivada"
                    ? FIRMADAS.includes(op.fase ?? "")
                      ? { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Ganada ✓" }
                      : { bg: "bg-red-50 text-red-600 border border-red-200", label: "Denegada" }
                    : op.status === "pendiente_de_validar"
                      ? { bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pendiente" }
                      : { bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "En curso" };
                  return (
                    <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 max-w-[180px] truncate">{op.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-[130px] truncate">{op.client_nombre ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{fmtEur(op.importe)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.comision_begreat)}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtEur(op.comision_colaborador)}</td>
                      <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">{fmtFecha(op.fecha_cierre ?? op.created_at)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link href={`/admin/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
