import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function AdminOperacionesPage() {
  const ops = await db
    .select({
      id: operations.id,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.identificador,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(operations.created_at);

  const pendientes = ops.filter((o) => o.status === "pendiente_de_validar");
  const activas = ops.filter((o) => o.status !== "pendiente_de_validar");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Operaciones</h1>
        <p className="text-sm text-gray-500 mt-1">{ops.length} total · {pendientes.length} pendientes de validar</p>
      </div>

      {pendientes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-3">
            Pendientes de validar ({pendientes.length})
          </h2>
          <OperationsTable ops={pendientes} admin />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Operaciones activas ({activas.length})
        </h2>
        <OperationsTable ops={activas} admin />
      </div>
    </div>
  );
}

function OperationsTable({ ops, admin }: { ops: any[]; admin?: boolean }) {
  if (ops.length === 0) return <p className="text-sm text-gray-400 py-4">Sin operaciones.</p>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-[#EEEBF3]">
            <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Importe</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Estado / Fase</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {ops.map((op) => (
            <tr key={op.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <p className="text-sm font-medium text-gray-900">{op.colaborador_nombre}</p>
                <p className="text-xs text-gray-400">{op.colaborador_id}</p>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">{op.client_nombre ?? "—"}</td>
              <td className="px-6 py-4">
                <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 rounded-full font-medium">
                  {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  op.status === "pendiente_de_validar"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {op.status === "pendiente_de_validar" ? "Pendiente de validar" : op.fase}
                </span>
              </td>
              <td className="px-6 py-4">
                <Link href={`/admin/operaciones/${op.id}`} className="text-[#2E1A47] text-sm font-medium hover:underline">
                  Gestionar →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
