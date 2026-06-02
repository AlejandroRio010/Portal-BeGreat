import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

function fmt(n: number | null | undefined) {
  if (!n) return "0 €";
  return `${n.toLocaleString("es-ES")} €`;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; desde?: string; hasta?: string }>;
}) {
  const { tipo, desde, hasta } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id as string;

  const allOps = await db
    .select({
      id: operations.id,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      equipo_tipo: operations.equipo_tipo,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      importe: operations.importe,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.collaborator_id, userId))
    .orderBy(operations.created_at);

  // Filters
  const filtered = allOps.filter((op) => {
    if (tipo && tipo !== "todas" && op.pipeline_key !== tipo) return false;
    if (desde) {
      const desdeDate = new Date(desde);
      if (new Date(op.created_at) < desdeDate) return false;
    }
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59);
      if (new Date(op.created_at) > hastaDate) return false;
    }
    return true;
  });

  // Stats (always on all ops, not filtered)
  const firmadas = allOps.filter((o) => o.fase === "Contract Signed" || o.fase === "Fees Paid" || o.fase === "Transfered Made");
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar" || (o.status === "activa" && o.fase !== "Contract Signed" && o.fase !== "Fees Paid" && o.fase !== "Transfered Made"));
  const totalGanado = firmadas.reduce((sum, o) => sum + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);
  const feePendiente = pendientes.reduce((sum, o) => sum + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);

  const stats = [
    {
      label: "Operaciones cerradas & firmadas",
      value: firmadas.length.toString(),
      color: "bg-[#2E1A47]",
      light: false,
    },
    {
      label: "Comisiones generadas",
      value: fmt(totalGanado),
      color: "bg-[#6B7280]",
      light: false,
    },
    {
      label: "Operaciones en estudio",
      value: pendientes.length.toString(),
      color: "bg-[#EEEBF3]",
      light: true,
    },
    {
      label: "Comisiones pendientes",
      value: fmt(feePendiente),
      color: "bg-white border border-gray-200",
      light: true,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial & Resumen</h1>
        <p className="text-sm text-gray-400 mt-1">Todas tus operaciones con BeGreat</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className={`${s.color} p-5`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${s.light ? "text-[#2E1A47]" : "text-white/70"}`}>{s.label}</p>
            <p className={`text-2xl font-black leading-tight ${s.light ? "text-[#2E1A47]" : "text-white"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-sm border border-gray-100 p-5 mb-6">
        <form className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
            <select name="tipo" defaultValue={tipo ?? "todas"} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todas</option>
              <option value="consultoria">Consultoría financiera</option>
              <option value="renting">Renting</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <button type="submit" className="bg-[#2E1A47] text-white px-5 py-2 rounded-sm text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
            Filtrar
          </button>
          {(tipo || desde || hasta) && (
            <Link href="/portal/historial" className="text-sm text-gray-400 hover:text-gray-600 py-2">
              Limpiar filtros
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-sm border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">{filtered.length} operación{filtered.length !== 1 ? "es" : ""}</p>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No hay operaciones con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fase</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Comisión</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((op) => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{op.client_nombre ?? "—"}</p>
                    {op.producto && <p className="text-xs text-gray-400">{op.producto}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                      op.pipeline_key === "consultoria" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-blue-50 text-blue-700"
                    }`}>
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {op.status === "pendiente_de_validar" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Pendiente
                      </span>
                    ) : op.fase === "Contract Signed" || op.fase === "Fees Paid" || op.fase === "Transfered Made" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        Firmada ✓
                      </span>
                    ) : op.status === "archivada" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-red-50 border border-red-200 text-red-600">
                        Denegada
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">{op.fase}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(op.created_at)}</td>
                  <td className="px-6 py-4">
                    {op.comision_colaborador ? (
                      <span className="text-sm font-bold text-[#2E1A47]">
                        {Number(op.comision_colaborador).toLocaleString("es-ES")} €
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
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
        )}
      </div>
    </div>
  );
}
