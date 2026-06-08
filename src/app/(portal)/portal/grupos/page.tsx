import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, clientGroups, operations } from "@/db/schema";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function PortalGruposPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  // Clientes del colaborador que pertenecen a un grupo
  const clientesConGrupo = await db
    .select({ id: clients.id, nombre: clients.nombre, group_id: clients.group_id })
    .from(clients)
    .where(and(eq(clients.collaborator_id, userId), isNotNull(clients.group_id)));

  if (clientesConGrupo.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Grupos empresariales</h1>
        <p className="text-sm text-gray-400 mb-8">Grupos a los que pertenecen tus clientes</p>
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Ninguno de tus clientes pertenece a un grupo empresarial todavía.</p>
          <Link href="/portal/clientes" className="inline-block mt-4 text-[#2E1A47] text-sm font-semibold hover:underline">← Volver a mis clientes</Link>
        </div>
      </div>
    );
  }

  // IDs de grupos únicos
  const groupIds = [...new Set(clientesConGrupo.map(c => c.group_id!))];

  // Datos de los grupos
  const grupos = await db
    .select()
    .from(clientGroups)
    .where(inArray(clientGroups.id, groupIds))
    .orderBy(clientGroups.nombre);

  // Contar empresas del colaborador por grupo y calcular financiación
  const clienteIds = clientesConGrupo.map(c => c.id);
  const ops = clienteIds.length > 0
    ? await db.select({ client_id: operations.client_id, fase: operations.fase, importe: operations.importe })
        .from(operations).where(inArray(operations.client_id, clienteIds))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Grupos empresariales</h1>
      <p className="text-sm text-gray-400 mb-8">{grupos.length} grupo{grupos.length !== 1 ? "s" : ""} con empresas tuyas</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {grupos.map(g => {
          const empresasEnGrupo = clientesConGrupo.filter(c => c.group_id === g.id);
          const clientIdsEnGrupo = empresasEnGrupo.map(c => c.id);
          const opsGrupo = ops.filter(o => clientIdsEnGrupo.includes(o.client_id ?? ""));
          const firmadas = opsGrupo.filter(o => FIRMADAS.includes(o.fase ?? ""));
          const totalFinanciado = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);

          return (
            <Link key={g.id} href={`/portal/grupos/${g.id}`}
              className="bg-white border border-gray-200 border-t-[3px] border-t-[#2E1A47] p-5 hover:shadow-md hover:border-gray-300 transition-all group flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] text-lg font-bold">
                  {g.nombre.charAt(0).toUpperCase()}
                </div>
                <span className="text-[#2E1A47] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-[#2E1A47] leading-tight">{g.nombre}</p>
              <div className="flex gap-4 mt-auto">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mis empresas</p>
                  <p className="text-sm font-black text-[#2E1A47]">{empresasEnGrupo.length}</p>
                </div>
                {totalFinanciado > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Financiado</p>
                    <p className="text-sm font-black text-[#2E1A47]">{fmtEur(totalFinanciado)}</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
