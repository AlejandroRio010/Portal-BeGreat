import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; estado?: string; desde?: string; hasta?: string; q?: string; colab?: string }>;
}) {
  const { tipo, estado, desde, hasta, q, colab } = await searchParams;

  const allOps = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      importe: operations.importe,
      created_at: operations.created_at,
      fecha_cierre: operations.fecha_cierre,
      client_nombre: clients.nombre,
      colaborador_id: collaborators.id,
      colaborador_nombre: collaborators.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(operations.fecha_cierre, operations.created_at);

  const colaboradoresLista = Array.from(
    new Map(allOps.filter(o => o.colaborador_id).map(o => [o.colaborador_id!, o.colaborador_nombre ?? "—"])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const qLower = q?.toLowerCase().trim() ?? "";
  const filtered = allOps.filter((op) => {
    if (qLower && !((op.nombre ?? "").toLowerCase().includes(qLower) || (op.client_nombre ?? "").toLowerCase().includes(qLower))) return false;
    if (colab && colab !== "todos" && op.colaborador_id !== colab) return false;
    if (tipo && tipo !== "todas" && op.pipeline_key !== tipo) return false;
    if (estado && estado !== "todas") {
      const esFirmada = FIRMADAS.includes(op.fase ?? "");
      const esEstado =
        estado === "firmada" ? esFirmada :
        estado === "pendiente" ? op.status === "pendiente_de_validar" :
        estado === "activa" ? op.status === "activa" && !esFirmada :
        estado === "archivada" ? op.status === "archivada" && !esFirmada : true;
      if (!esEstado) return false;
    }
    if (desde && new Date(op.created_at) < new Date(desde)) return false;
    if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59); if (new Date(op.created_at) > h) return false; }
    return true;
  });

  const firmadas = allOps.filter((o) => FIRMADAS.includes(o.fase ?? ""));
  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar" || (o.status === "activa" && !FIRMADAS.includes(o.fase ?? "")));
  const feeBegreat = firmadas.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);
  const feeColab = firmadas.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial & Resumen</h1>
        <p className="text-sm text-gray-400 mt-1">Todas las operaciones de todos los colaboradores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Ops firmadas</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee BeGreat cobrada</p>
            <p className="text-2xl font-black text-white leading-tight">{fmtEur(feeBegreat)}</p>
          </div>
        </div>
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">En estudio</p>
            <p className="text-3xl font-black text-[#2E1A47]">{pendientes.length}</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee colaboradores</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{fmtEur(feeColab)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 p-5 mb-6">
        <form className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Buscar</label>
            <input name="q" defaultValue={q ?? ""} placeholder="Operación o cliente..." className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Colaborador</label>
            <select name="colab" defaultValue={colab ?? "todos"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todos">Todos</option>
              {colaboradoresLista.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
            <select name="tipo" defaultValue={tipo ?? "todas"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todas</option>
              <option value="consultoria">Consultoría</option>
              <option value="renting">Renting</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select name="estado" defaultValue={estado ?? "todas"} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50">
              <option value="todas">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="activa">En estudio</option>
              <option value="firmada">Firmada</option>
              <option value="archivada">Denegada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50" />
          </div>
          <button type="submit" className="bg-[#2E1A47] text-white px-5 py-2 text-sm font-semibold hover:bg-[#5a3d80] transition-colors">Filtrar</button>
          {(tipo || estado || desde || hasta || q || colab) && (
            <Link href="/admin/historial" className="text-sm text-gray-400 hover:text-gray-600 py-2">Limpiar</Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">{filtered.length} operación{filtered.length !== 1 ? "es" : ""}</p>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><p className="text-gray-400 text-sm">No hay operaciones con los filtros aplicados.</p></div>
        ) : (
          <div style={{ zoom: 0.85 }}>
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente / Operación</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha cierre</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee BeGreat</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee Colab.</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((op) => {
                const esFirmada = FIRMADAS.includes(op.fase ?? "");
                const badge = op.status === "pendiente_de_validar"
                  ? { c: "bg-amber-50 border border-amber-200 text-amber-700", l: "Pendiente" }
                  : esFirmada ? { c: "bg-emerald-50 border border-emerald-200 text-emerald-700", l: "Firmada ✓" }
                  : op.status === "archivada" ? { c: "bg-red-50 border border-red-200 text-red-600", l: "Denegada" }
                  : { c: "bg-blue-50 border border-blue-200 text-blue-700", l: "En estudio" };
                return (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{op.nombre ?? op.client_nombre ?? "—"}</p>
                      {op.client_nombre && <p className="text-xs text-gray-400 mt-0.5">{op.client_nombre}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.colaborador_nombre ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold ${op.pipeline_key === "consultoria" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-blue-50 text-blue-700"}`}>
                        {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${badge.c}`}>{badge.l}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(op.fecha_cierre ?? op.created_at)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.comision_begreat)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtEur(op.comision_colaborador)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/operaciones/${op.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
