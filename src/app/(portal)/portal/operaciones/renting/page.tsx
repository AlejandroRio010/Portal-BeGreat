import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

export default async function RentingPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const ops = await db
    .select({
      id: operations.id,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      lugar_entrega: operations.lugar_entrega,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      supplier_nombre: suppliers.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(suppliers, eq(operations.supplier_id, suppliers.id))
    .where(
      and(
        eq(operations.collaborator_id, userId),
        eq(operations.pipeline_key, "renting")
      )
    )
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Operaciones de renting</h1>
        <p className="text-sm text-gray-500 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""}</p>
      </div>

      {ops.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No tienes operaciones de renting todavía.</p>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Proveedor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Fase</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#2E1A47] uppercase tracking-wider">Entrega</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ops.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{op.supplier_nombre ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      op.status === "pendiente_de_validar"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-[#EEEBF3] text-[#2E1A47]"
                    }`}>
                      {op.status === "pendiente_de_validar" ? "Pendiente de validar" : op.fase}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{op.lugar_entrega ?? "—"}</td>
                  <td className="px-6 py-4">
                    <Link href={`/portal/operaciones/${op.id}`} className="text-[#2E1A47] text-sm font-medium hover:underline">
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
