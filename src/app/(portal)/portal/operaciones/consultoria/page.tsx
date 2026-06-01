import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, pipelines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

const FASE_COLORS: Record<string, string> = {
  "Pre-analysis": "bg-gray-100 text-gray-700",
  "Fee Signature": "bg-blue-100 text-blue-700",
  "Under Entity Review": "bg-yellow-100 text-yellow-700",
  "Operation Approved": "bg-green-100 text-green-700",
  "Contract Signed": "bg-purple-100 text-purple-700",
  "Fees Paid": "bg-emerald-100 text-emerald-700",
  "pendiente_de_validar": "bg-orange-100 text-orange-700",
};

export default async function ConsultoriaPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const ops = await db
    .select({
      id: operations.id,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(
      and(
        eq(operations.collaborator_id, userId),
        eq(operations.pipeline_key, "consultoria")
      )
    )
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Operaciones de consultoría financiera</h1>
        <p className="text-sm text-gray-500 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""}</p>
      </div>

      {ops.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No tienes operaciones de consultoría todavía.</p>
          <Link
            href="/portal/alta-operacion"
            className="inline-block mt-4 bg-[#2E1A47] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5a3d80] transition-colors"
          >
            Dar de alta una operación
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-[#EEEBF3]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Producto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Fase</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Comisión</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ops.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {op.client_nombre ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{op.producto ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      op.status === "pendiente_de_validar"
                        ? "bg-orange-100 text-orange-700"
                        : FASE_COLORS[op.fase] ?? "bg-gray-100 text-gray-700"
                    }`}>
                      {op.status === "pendiente_de_validar" ? "Pendiente de validar" : op.fase}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {op.comision_colaborador ? `${Number(op.comision_colaborador).toLocaleString("es-ES")} €` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/portal/operaciones/${op.id}`}
                      className="text-[#2E1A47] text-sm font-medium hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
