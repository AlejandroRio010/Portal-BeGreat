import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

function StatusBadge({ status, fase }: { status: string; fase: string | null }) {
  if (status === "pendiente_de_validar") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Pendiente
      </span>
    );
  }
  if (status === "archivada") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
        Archivada
      </span>
    );
  }
  if (fase === "Contrato firmado" || fase === "Honorarios pagados" || fase === "Transferencia realizada") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
        Firmada ✓
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600">{fase ?? "—"}</span>
  );
}

export default async function AdminOperacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string; tipo?: string; status?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const { colaborador: colaboradorFilter, tipo: tipoFilter, status: statusFilter, desde, hasta } = sp;

  // Fetch all collaborators for filter dropdown
  const allColaboradores = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre })
    .from(collaborators)
    .where(eq(collaborators.role, "colaborador"))
    .orderBy(collaborators.nombre);

  // Fetch operations
  let query = db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: operations.collaborator_id,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(desc(operations.created_at));

  let ops = await query;

  // Client-side filtering (simpler than dynamic drizzle queries)
  if (colaboradorFilter) ops = ops.filter((o) => o.colaborador_id === colaboradorFilter);
  if (tipoFilter && tipoFilter !== "todas") ops = ops.filter((o) => o.pipeline_key === tipoFilter);
  if (statusFilter && statusFilter !== "todos") {
    if (statusFilter === "firmada") {
      ops = ops.filter((o) => o.fase === "Contrato firmado" || o.fase === "Honorarios pagados" || o.fase === "Transferencia realizada");
    } else {
      ops = ops.filter((o) => o.status === statusFilter);
    }
  }
  if (desde) ops = ops.filter((o) => new Date(o.created_at) >= new Date(desde));
  if (hasta) ops = ops.filter((o) => new Date(o.created_at) <= new Date(hasta + "T23:59:59"));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operaciones</h1>
        <p className="text-sm text-gray-400 mt-1">{ops.length} operaciones</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6 bg-white border border-gray-200 p-4">
        <select
          name="colaborador"
          defaultValue={colaboradorFilter ?? ""}
          className="text-sm border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#2E1A47]"
        >
          <option value="">Todos los colaboradores</option>
          {allColaboradores.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          name="tipo"
          defaultValue={tipoFilter ?? "todas"}
          className="text-sm border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#2E1A47]"
        >
          <option value="todas">Todos los tipos</option>
          <option value="consultoria">Consultoría</option>
          <option value="renting">Renting</option>
        </select>

        <select
          name="status"
          defaultValue={statusFilter ?? "todos"}
          className="text-sm border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#2E1A47]"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente_de_validar">Pendiente de validar</option>
          <option value="activa">Activa</option>
          <option value="firmada">Firmada</option>
          <option value="archivada">Archivada</option>
        </select>

        <input
          type="date"
          name="desde"
          defaultValue={desde ?? ""}
          className="text-sm border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#2E1A47]"
        />
        <input
          type="date"
          name="hasta"
          defaultValue={hasta ?? ""}
          className="text-sm border border-gray-200 px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-[#2E1A47]"
        />

        <button
          type="submit"
          className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors"
        >
          Filtrar
        </button>
        {(colaboradorFilter || tipoFilter || statusFilter || desde || hasta) && (
          <Link href="/admin/operaciones" className="px-4 py-2 border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center">
            Limpiar filtros
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {ops.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Sin operaciones con los filtros aplicados.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre op.</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ops.map((op) => {
                const fee =
                  (op.comision_colaborador ? Number(op.comision_colaborador) : 0) +
                  (op.comision_begreat ? Number(op.comision_begreat) : 0);
                return (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                      {op.nombre ?? op.client_nombre ?? "—"}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{op.client_nombre ?? "—"}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{op.colaborador_nombre ?? "—"}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 font-medium">
                        {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={op.status} fase={op.fase} />
                    </td>
                    <td className="px-6 py-3.5 text-sm">
                      {fee > 0
                        ? <span className="font-bold text-[#2E1A47]">{fee.toLocaleString("es-ES")} €</span>
                        : <span className="text-gray-300">—</span>}
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
