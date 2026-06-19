import { db } from "@/db";
import { clients, collaborators, operations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import ClientesTabla from "@/components/ClientesTabla";
import NuevoClienteToggle from "./ClientesPageClient";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string }>;
}) {
  const sp = await searchParams;
  const colaboradorFilter = sp.colaborador;

  const allColaboradores = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre, role: collaborators.role })
    .from(collaborators)
    .where(eq(collaborators.activo, true))
    .orderBy(collaborators.nombre);

  // Fetch clients with collaborator name
  let cls = await db
    .select({
      id: clients.id,
      nombre: clients.nombre,
      codigo: clients.codigo,
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

  const avalClientIds = await db
    .select({ aval_client_id: operations.aval_client_id })
    .from(operations)
    .where(sql`${operations.aval_client_id} is not null`)
    .groupBy(operations.aval_client_id);
  const avalSet = new Set(avalClientIds.map(r => r.aval_client_id!));

  return (
    <div>
      <NuevoClienteToggle colaboradores={allColaboradores} />
      <p className="text-sm text-gray-400 -mt-4 mb-6">{cls.length} empresas</p>

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

      <ClientesTabla esAdmin hrefBase="/admin/clientes" clientes={cls.map(c => ({
        id: c.id, nombre: c.nombre, codigo: c.codigo, cif: c.cif, email: c.email,
        colaborador_nombre: c.colaborador_nombre, ops: opCountMap.get(c.id) ?? 0, esAvalista: avalSet.has(c.id),
      }))} />
    </div>
  );
}
