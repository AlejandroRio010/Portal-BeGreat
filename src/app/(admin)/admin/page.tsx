import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("es-ES") + " €";
}

export default async function AdminHomePage() {
  // All operations for KPIs
  const allOps = await db
    .select({
      id: operations.id,
      status: operations.status,
      fase: operations.fase,
      pipeline_key: operations.pipeline_key,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      nombre: operations.nombre,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(desc(operations.created_at));

  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar");
  const firmadas = allOps.filter(
    (o) => o.fase === "Contract Signed" || o.fase === "Fees Paid" || o.fase === "Transfered Made"
  );
  const feeTotalGenerada = firmadas.reduce(
    (s, o) => s + (o.comision_colaborador ? Number(o.comision_colaborador) : 0) + (o.comision_begreat ? Number(o.comision_begreat) : 0),
    0
  );
  const feePendiente = allOps
    .filter((o) => o.status !== "archivada" && o.fase !== "Contract Signed" && o.fase !== "Fees Paid" && o.fase !== "Transfered Made")
    .reduce(
      (s, o) => s + (o.comision_colaborador ? Number(o.comision_colaborador) : 0) + (o.comision_begreat ? Number(o.comision_begreat) : 0),
      0
    );

  // Last 8 pending validation
  const pendientes8 = pendientes.slice(0, 8);

  // Ranking collaborators
  const colabMap = new Map<
    string,
    { nombre: string; ops: number; fee: number }
  >();
  for (const op of allOps) {
    if (!op.colaborador_id) continue;
    const entry = colabMap.get(op.colaborador_id) ?? { nombre: op.colaborador_nombre ?? "—", ops: 0, fee: 0 };
    entry.ops += 1;
    entry.fee +=
      (op.comision_colaborador ? Number(op.comision_colaborador) : 0) +
      (op.comision_begreat ? Number(op.comision_begreat) : 0);
    colabMap.set(op.colaborador_id, entry);
  }
  const ranking = Array.from(colabMap.values()).sort((a, b) => b.fee - a.fee).slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-400 mt-1">{allOps.length} operaciones totales</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Pareja oscura */}
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Total operaciones</p>
            <p className="text-3xl font-black text-white">{allOps.length}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Pendientes validar</p>
            <p className="text-3xl font-black text-white">{pendientes.length}</p>
          </div>
        </div>
        {/* Pareja clara */}
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee total generada</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{feeTotalGenerada > 0 ? fmt(feeTotalGenerada) : "—"}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee pendiente</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{feePendiente > 0 ? fmt(feePendiente) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Pending validation table */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">
            Pendientes de validar
            {pendientes.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px]">
                {pendientes.length}
              </span>
            )}
          </p>
          <Link href="/admin/operaciones?status=pendiente_de_validar" className="text-xs text-[#2E1A47] font-semibold hover:underline">
            Ver todas →
          </Link>
        </div>
        {pendientes8.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-300">No hay operaciones pendientes de validar.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre op.</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendientes8.map((op) => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{op.colaborador_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-700">{op.nombre ?? op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 font-medium">
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">
                    {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3.5">
                    <Link href={`/admin/operaciones/${op.id}`} className="text-[#2E1A47] text-xs font-semibold hover:underline">
                      Gestionar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ranking colaboradores */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Ranking de colaboradores</p>
        </div>
        {ranking.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-300">Sin datos.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">#</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nº ops</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee generada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ranking.map((c, i) => (
                <tr key={i} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{c.ops}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-[#2E1A47]">{c.fee > 0 ? fmt(c.fee) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
