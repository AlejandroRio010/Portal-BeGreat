import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups, clients, operations } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

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

  if (empresas.length === 0) notFound();

  const empresaIds = empresas.map(e => e.id);
  const ops = await db
    .select({ id: operations.id, fase: operations.fase, importe: operations.importe, comision_colaborador: operations.comision_colaborador })
    .from(operations)
    .where(inArray(operations.client_id, empresaIds));

  const firmadas = ops.filter(o => FIRMADAS.includes(o.fase ?? ""));
  const totalFinanciado = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const feeColab = firmadas.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

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
        {/* Col 1: Datos del grupo */}
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

        {/* Col 2-3: Empresas */}
        <div className="col-span-2">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">
                Mis empresas en este grupo ({empresas.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {empresas.map(c => (
                <Link
                  key={c.id}
                  href={`/portal/clientes/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#EEEBF3]/30 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{c.nombre}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.codigo && <span className="text-[10px] font-mono text-gray-400">{c.codigo}</span>}
                      {c.cif && <span className="text-[10px] text-gray-400">{c.cif}</span>}
                    </div>
                  </div>
                  <span className="text-[#2E1A47] text-sm opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
