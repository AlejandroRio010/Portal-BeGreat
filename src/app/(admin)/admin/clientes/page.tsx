import { db } from "@/db";
import { clients, collaborators, operations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string }>;
}) {
  const sp = await searchParams;
  const colaboradorFilter = sp.colaborador;

  const allColaboradores = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre })
    .from(collaborators)
    .where(eq(collaborators.role, "colaborador"))
    .orderBy(collaborators.nombre);

  // Fetch clients with collaborator name
  let cls = await db
    .select({
      id: clients.id,
      nombre: clients.nombre,
      cif: clients.cif,
      email: clients.email,
      created_at: clients.created_at,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: clients.collaborator_id,
    })
    .from(clients)
    .leftJoin(collaborators, eq(clients.collaborator_id, collaborators.id))
    .orderBy(clients.nombre);

  if (colaboradorFilter) cls = cls.filter((c) => c.colaborador_id === colaboradorFilter);

  // Count ops per client
  const opCounts = await db
    .select({ client_id: operations.client_id, count: sql<number>`count(*)::int` })
    .from(operations)
    .groupBy(operations.client_id);

  const opCountMap = new Map<string, number>();
  for (const row of opCounts) {
    if (row.client_id) opCountMap.set(row.client_id, row.count);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-400 mt-1">{cls.length} empresas</p>
      </div>

      {/* Filter */}
      <form method="GET" className="flex gap-3 mb-6 bg-white border border-gray-200 p-4">
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
        <button
          type="submit"
          className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors"
        >
          Filtrar
        </button>
        {colaboradorFilter && (
          <Link href="/admin/clientes" className="px-4 py-2 border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center">
            Limpiar
          </Link>
        )}
      </form>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {cls.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Sin clientes.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre empresa</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">CIF</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nº ops</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cls.map((c) => (
                <tr key={c.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{c.cif ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{c.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{c.colaborador_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{opCountMap.get(c.id) ?? 0}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
