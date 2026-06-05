import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups, clients, operations } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

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
    .from(clients).where(and(eq(clients.group_id, id), eq(clients.collaborator_id, userId))).orderBy(clients.nombre);

  if (empresas.length === 0) notFound();

  const empresaIds = empresas.map(e => e.id);
  const ops = await db.select({ fase: operations.fase, importe: operations.importe })
    .from(operations).where(inArray(operations.client_id, empresaIds));
  const firmadas = ops.filter(o => FIRMADAS.includes(o.fase ?? ""));
  const totalFinanciado = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/clientes" className="hover:text-[#2E1A47] font-medium">Mis clientes</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{grupo.nombre}</span>
      </div>

      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{grupo.nombre.charAt(0)}</div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Grupo empresarial</p>
            <p className="text-white text-xl font-bold">{grupo.nombre}</p>
            {grupo.web && <a href={grupo.web} target="_blank" rel="noopener noreferrer" className="text-white/50 text-xs hover:text-white/80 mt-0.5 block">{grupo.web.replace(/^https?:\/\//, "")}</a>}
          </div>
        </div>
        <span className="text-white/50 text-xs">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""} tuya{empresas.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-2 gap-4">
        <div className="bg-[#2E1A47] px-6 py-5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Empresas tuyas en el grupo</p>
          <p className="text-3xl font-black text-white">{empresas.length}</p>
        </div>
        <div className="bg-[#EEEBF3] px-6 py-5">
          <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Financiación conseguida</p>
          <p className="text-2xl font-black text-[#2E1A47] leading-tight">{totalFinanciado > 0 ? fmtEur(totalFinanciado) : "—"}</p>
        </div>
      </div>

      <div className="mx-8 mb-6">
        {grupo.descripcion && <p className="text-sm text-gray-500 mb-4">{grupo.descripcion}</p>}
        <div className="bg-white border border-gray-200">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200"><h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tus empresas en este grupo</h3></div>
          <div className="divide-y divide-gray-50">
            {empresas.map(c => (
              <Link key={c.id} href={`/portal/clientes/${c.id}`} className="block px-5 py-3 hover:bg-[#EEEBF3]/30 transition-colors group">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{c.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.codigo && <span className="text-[10px] font-mono text-gray-400">{c.codigo}</span>}
                  {c.cif && <span className="text-[10px] text-gray-400">{c.cif}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
