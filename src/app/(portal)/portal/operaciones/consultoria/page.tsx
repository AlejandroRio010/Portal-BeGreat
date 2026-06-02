import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

const FASE_STYLE: Record<string, string> = {
  "Pre-analysis": "bg-gray-100 text-gray-600",
  "Fee Signature": "bg-blue-100 text-blue-700",
  "Under Entity Review": "bg-yellow-100 text-yellow-700",
  "Operation Approved": "bg-green-100 text-green-700",
  "Contract Signed": "bg-purple-100 text-purple-700",
  "Fees Paid": "bg-emerald-100 text-emerald-800",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ConsultoriaPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
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
    .where(and(eq(operations.collaborator_id, userId), eq(operations.pipeline_key, "consultoria")))
    .orderBy(operations.created_at);

  const activas = ops.filter((o) => o.status !== "pendiente_de_validar");
  const pendientes = ops.filter((o) => o.status === "pendiente_de_validar");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultoría financiera</h1>
          <p className="text-sm text-gray-400 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""} en total</p>
        </div>
        <Link
          href="/portal/alta-operacion"
          className="inline-flex items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors"
        >
          + Nueva operación
        </Link>
      </div>

      {ops.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {pendientes.length > 0 && (
            <Section title="Pendientes de validar" count={pendientes.length} accent ops={pendientes} />
          )}
          <Section title="Operaciones activas" count={activas.length} ops={activas} />
        </div>
      )}
    </div>
  );
}

function Section({ title, count, ops, accent }: { title: string; count: number; ops: any[]; accent?: boolean }) {
  if (ops.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className={`text-xs font-bold uppercase tracking-widest ${accent ? "text-orange-500" : "text-gray-400"}`}>{title}</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${accent ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>{count}</span>
      </div>
      <div className="bg-white rounded-sm border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-[#EEEBF3] border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Producto</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fase</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha alta</th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee / Comisión</th>
              <th className="px-6 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ops.map((op) => (
              <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900">{op.nombre ?? op.client_nombre ?? "—"}</p>
                  {op.nombre && op.client_nombre && (
                    <p className="text-xs text-gray-400 mt-0.5">{op.client_nombre}</p>
                  )}
                  {op.importe && (
                    <p className="text-xs text-gray-400 mt-0.5">{Number(op.importe).toLocaleString("es-ES")} €</p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{op.producto ?? "—"}</td>
                <td className="px-6 py-4">
                  {op.status === "pendiente_de_validar" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                      <span className="w-1.5 h-1.5 rounded bg-orange-400 animate-pulse" />
                      Pendiente de validar
                    </span>
                  ) : (
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${FASE_STYLE[op.fase] ?? "bg-gray-100 text-gray-600"}`}>
                      {op.fase}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(op.created_at)}</td>
                <td className="px-6 py-4">
                  {op.comision_colaborador ? (
                    <span className="text-sm font-bold text-[#2E1A47]">
                      {Number(op.comision_colaborador).toLocaleString("es-ES")} €
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Por confirmar</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/portal/operaciones/${op.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-sm border border-gray-100 p-16 text-center">
      <div className="w-16 h-16 bg-[#EEEBF3] rounded-sm flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">💼</span>
      </div>
      <h3 className="font-semibold text-gray-800 mb-1">Sin operaciones todavía</h3>
      <p className="text-sm text-gray-400 mb-5">Da de alta tu primera operación de consultoría financiera</p>
      <Link href="/portal/alta-operacion" className="inline-flex items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
        + Dar de alta operación
      </Link>
    </div>
  );
}
