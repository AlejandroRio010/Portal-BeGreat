import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups, clients, operations, clientGroupContacts } from "@/db/schema";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PortalEmpresasGrupoPanel from "./PortalEmpresasGrupoPanel";
import ContactosGrupoPanel from "@/components/ContactosGrupoPanel";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export default async function PortalGrupoFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  const [grupo] = await db.select().from(clientGroups).where(eq(clientGroups.id, id)).limit(1);
  if (!grupo) notFound();

  // Solo las empresas de este colaborador dentro del grupo
  const empresas = await db
    .select({ id: clients.id, nombre: clients.nombre, codigo: clients.codigo, cif: clients.cif })
    .from(clients)
    .where(and(eq(clients.group_id, id), eq(clients.collaborator_id, userId)))
    .orderBy(clients.nombre);

  // Mis clientes sin grupo (para poder añadir)
  const disponibles = await db
    .select({ id: clients.id, nombre: clients.nombre, codigo: clients.codigo, cif: clients.cif })
    .from(clients)
    .where(and(eq(clients.collaborator_id, userId), isNull(clients.group_id)))
    .orderBy(clients.nombre);

  const contactosGrupo = await db.select().from(clientGroupContacts).where(eq(clientGroupContacts.group_id, id)).orderBy(clientGroupContacts.created_at);

  if (empresas.length === 0 && disponibles.length === 0) notFound();

  const empresaIds = empresas.map(e => e.id);
  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      fecha_cierre: operations.fecha_cierre,
      created_at: operations.created_at,
      client_id: operations.client_id,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(inArray(operations.client_id, empresaIds))
    .orderBy(operations.fecha_cierre, operations.created_at);

  const firmadas = ops.filter(o => FIRMADAS.includes(o.fase ?? ""));
  const totalFinanciado = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const feeColab = firmadas.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  function fmtFecha(d: Date | null | undefined) {
    if (!d) return "—";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
  }

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/grupos" className="hover:text-[#2E1A47] font-medium">Grupos empresariales</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{grupo.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
            {grupo.nombre.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-bold">{grupo.nombre}</p>
              {grupo.codigo && (
                <span className="text-[10px] font-bold font-mono bg-white/20 text-white px-2 py-0.5 tracking-wider">{grupo.codigo}</span>
              )}
            </div>
            {grupo.web && (
              <a href={grupo.web} target="_blank" rel="noopener noreferrer" className="text-white/50 text-xs hover:text-white/80 mt-0.5 block">
                {grupo.web.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <span className="text-white/50 text-xs">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</span>
      </div>

      {/* KPIs — igual que admin */}
      <div className="mx-8 mb-6 grid grid-cols-3 gap-4">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Mis empresas</p>
          <p className="text-3xl font-black text-white">{empresas.length}</p>
        </div>
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
          <p className="text-2xl font-black text-white leading-tight">{totalFinanciado > 0 ? fmtEur(totalFinanciado) : "—"}</p>
        </div>
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Mi fee acumulada</p>
          <p className="text-2xl font-black text-white leading-tight">{feeColab > 0 ? fmtEur(feeColab) : "—"}</p>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: Datos del grupo + contactos */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos del grupo</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {([
                ["Nombre", grupo.nombre],
                ["CIF matriz", grupo.cif_matriz],
                ["Web", grupo.web],
                ["Descripción", grupo.descripcion],
              ] as [string, string | null][]).map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>
          <ContactosGrupoPanel contactos={contactosGrupo} groupId={id} />
        </div>

        {/* Col 2-3: Empresas */}
        <div className="col-span-2">
          <PortalEmpresasGrupoPanel
            grupoId={id}
            empresas={empresas}
            disponibles={disponibles}
          />
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
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-[140px] truncate">{op.client_nombre ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="bg-[#EEEBF3] text-[#2E1A47] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 font-medium">
                        {fmtEur(op.importe)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{fmtFecha(op.fecha_cierre ?? op.created_at)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link href={`/portal/operaciones/${op.id}`} className="text-xs text-[#2E1A47] font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
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
