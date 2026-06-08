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
  searchParams: Promise<{ tipo?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const { tipo, estado, desde, hasta } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id as string;

  const allOps = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
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
    if (estado && estado !== "todas") {
      const esFirmada = op.fase === "Contrato firmado" || op.fase === "Honorarios pagados" || op.fase === "Transferencia realizada";
      const esEstado =
        estado === "firmada" ? esFirmada :
        estado === "pendiente" ? op.status === "pendiente_de_validar" :
        estado === "activa" ? op.status === "activa" && !esFirmada :
        estado === "archivada" ? op.status === "archivada" : true;
      if (!esEstado) return false;
    }
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
  const firmadas = allOps.filter((o) => o.fase === "Contrato firmado" || o.fase === "Honorarios pagados" || o.fase === "Transferencia realizada");
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar" || (o.status === "activa" && o.fase !== "Contrato firmado" && o.fase !== "Honorarios pagados" && o.fase !== "Transferencia realizada"));
  const totalGanado = firmadas.reduce((sum, o) => sum + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);
  const feePendiente = pendientes.reduce((sum, o) => sum + (o.comision_colaborador ? Number(o.comision_colaborador) : 0), 0);

  // stats array kept for reference but replaced with custom render below

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial & Resumen</h1>
        <p className="text-sm text-gray-400 mt-1">Todas tus operaciones con BeGreat</p>
      </div>

      {/* Stats — dos parejas igual que inicio */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {/* Pareja 1: oscura */}
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Ops. firmadas</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee generadas</p>
            <p className="text-2xl font-black text-white leading-tight">{fmt(totalGanado)}</p>
          </div>
        </div>
        {/* Pareja 2: clara */}
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">En estudio</p>
            <p className="text-3xl font-black text-[#2E1A47]">{pendientes.length}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee pendiente</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{fmt(feePendiente)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-sm border border-gray-100 p-5 mb-6">
        <form className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
            <select name="tipo" defaultValue={tipo ?? "todas"} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todas</option>
              <option value="consultoria">Consultoría financiera</option>
              <option value="renting">Renting</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select name="estado" defaultValue={estado ?? "todas"} className="px-3 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todos</option>
              <option value="pendiente">Pendiente de validar</option>
              <option value="activa">En estudio</option>
              <option value="firmada">Firmada</option>
              <option value="archivada">Denegada</option>
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
          {(tipo || estado || desde || hasta) && (
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
          <div style={{ zoom: 0.88 }}>
        <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente / Operación</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
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
                    {op.nombre && <p className="text-xs text-[#2E1A47]/70 font-medium mt-0.5">{op.nombre}</p>}
                    {!op.nombre && op.producto && <p className="text-xs text-gray-400">{op.producto}</p>}
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
                    ) : op.fase === "Contrato firmado" || op.fase === "Honorarios pagados" || op.fase === "Transferencia realizada" ? (
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
          </div>
        )}
      </div>
    </div>
  );
}
