import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

function fmt(n: number) {
  return n.toLocaleString("es-ES") + " €";
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const FIRMADAS      = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];
const FASES_APROB   = ["Operación aprobada", "Condiciones aceptadas"];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;

  const allOps = await db
    .select({
      id: operations.id,
      status: operations.status,
      fase: operations.fase,
      pipeline_key: operations.pipeline_key,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      importe: operations.importe,
      nombre: operations.nombre,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
      colaborador_id: collaborators.id,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .orderBy(desc(operations.created_at));

  const pendientes = allOps.filter((o) => o.status === "pendiente_de_validar");
  const firmadas   = allOps.filter((o) => FIRMADAS.includes(o.fase ?? ""));

  const feeBegreat = firmadas.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);
  const feeColab   = firmadas.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  const pendientes8 = pendientes.slice(0, 8);

  // Ranking
  const colabMap = new Map<string, { nombre: string; ops: number; fee: number }>();
  for (const op of allOps) {
    if (!op.colaborador_id) continue;
    const entry = colabMap.get(op.colaborador_id) ?? { nombre: op.colaborador_nombre ?? "—", ops: 0, fee: 0 };
    entry.ops += 1;
    entry.fee += Number(op.comision_colaborador ?? 0) + Number(op.comision_begreat ?? 0);
    colabMap.set(op.colaborador_id, entry);
  }
  const ranking = Array.from(colabMap.values()).sort((a, b) => b.fee - a.fee).slice(0, 10);

  // Year filter
  const availableYears = Array.from(
    new Set(allOps.map((o) => new Date(o.created_at).getFullYear()))
  ).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const selectedYear = sp.year ? parseInt(sp.year) : (availableYears[0] ?? currentYear);

  // Monthly chart: bars = ops firmadas count, tooltip = fee BeGreat ese mes
  const monthlyOps = Array(12).fill(0);
  const monthlyFeeBegreat = Array(12).fill(0);
  for (const op of allOps) {
    const d = new Date(op.created_at);
    if (d.getFullYear() !== selectedYear) continue;
    if (!FIRMADAS.includes(op.fase ?? "")) continue;
    const m = d.getMonth();
    monthlyOps[m] += 1;
    monthlyFeeBegreat[m] += Number(op.comision_begreat ?? 0);
  }
  const maxOps = Math.max(...monthlyOps, 1);
  const yearTotalFeeBegreat = monthlyFeeBegreat.reduce((s, v) => s + v, 0);
  const yearTotalOps        = monthlyOps.reduce((s, v) => s + v, 0);

  // Blocks: ops en marcha (activas, no firmadas)
  const activas = allOps.filter((o) => o.status === "activa" && !FIRMADAS.includes(o.fase ?? ""));
  const opsAprob   = activas.filter((o) => FASES_APROB.includes(o.fase ?? ""));
  const opsEstudio = activas.filter((o) => !FASES_APROB.includes(o.fase ?? ""));

  const sumBegreat = (ops: typeof activas) =>
    ops.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-400 mt-1">{allOps.length} operaciones totales</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Oscura: ops firmadas + fee BeGreat */}
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Ops firmadas (total)</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">contratos cerrados</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee BeGreat cobrada</p>
            <p className="text-2xl font-black text-white leading-tight">{feeBegreat > 0 ? fmt(feeBegreat) : "—"}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">acumulado total</p>
          </div>
        </div>
        {/* Clara: fee colaboradores + pendientes */}
        <div className="flex overflow-hidden border border-[#EEEBF3]">
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Fee colaboradores cobrada</p>
            <p className="text-2xl font-black text-[#2E1A47] leading-tight">{feeColab > 0 ? fmt(feeColab) : "—"}</p>
            <p className="text-[#2E1A47]/30 text-[9px] mt-1 uppercase tracking-wide">valor generado</p>
          </div>
          <div className="w-px bg-[#2E1A47]/25" />
          <div className="flex-1 bg-[#EEEBF3] px-6 py-5">
            <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-[0.18em] mb-2 flex items-center gap-2">
              Pendientes de validar
              {pendientes.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />}
            </p>
            <p className="text-3xl font-black text-[#2E1A47]">{pendientes.length}</p>
            <p className="text-[#2E1A47]/30 text-[9px] mt-1 uppercase tracking-wide">esperando revisión</p>
          </div>
        </div>
      </div>

      {/* ── Gráfico anual ── */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Ops firmadas por mes</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Pasa el ratón por la barra para ver la fee BeGreat de ese mes</p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={String(selectedYear)}
              className="border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#2E1A47]"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              {!availableYears.includes(currentYear) && (
                <option value={currentYear}>{currentYear}</option>
              )}
            </select>
            <button type="submit" className="px-3 py-1.5 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors">
              Ver
            </button>
          </form>
        </div>

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end gap-1 h-[120px]">
            {monthlyOps.map((opsCount, i) => {
              const h = opsCount > 0 ? Math.max(8, Math.round((opsCount / maxOps) * 120)) : 0;
              const feeMes = monthlyFeeBegreat[i];
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="relative flex-1 flex items-end w-full">
                    {opsCount > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#2E1A47] text-white text-[9px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                        <span className="block font-bold">{opsCount} op{opsCount !== 1 ? "s" : ""}</span>
                        {feeMes > 0 && <span className="block text-white/70">Fee: {fmt(feeMes)}</span>}
                      </div>
                    )}
                    <div
                      className="w-full transition-all group-hover:opacity-80"
                      style={{
                        height: h > 0 ? `${h}px` : "3px",
                        backgroundColor: h > 0 ? "#2E1A47" : "#EEEBF3",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            {MESES.map((m, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-gray-400 font-medium">{m}</div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-8 border-t border-gray-100 pt-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ops firmadas {selectedYear}</p>
            <p className="text-lg font-black text-[#2E1A47]">{yearTotalOps}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Fee BeGreat {selectedYear}</p>
            <p className="text-lg font-black text-[#2E1A47]">{yearTotalFeeBegreat > 0 ? fmt(yearTotalFeeBegreat) : "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Bloques ops en marcha ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total activas */}
        <div className="bg-[#2E1A47] p-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-4">Ops en marcha</p>
          <p className="text-4xl font-black text-white mb-1">{activas.length}</p>
          <p className="text-white/40 text-[9px] uppercase tracking-wide">en ambos funnels</p>
        </div>

        {/* Aprobadas / pendientes de firmar */}
        <div className="bg-white border border-gray-200 p-6">
          <p className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-widest mb-4">Aprobadas / pendientes firmar</p>
          <p className="text-4xl font-black text-[#2E1A47] mb-1">{opsAprob.length}</p>
          <p className="text-gray-400 text-[9px] uppercase tracking-wide mb-4">en fase de aprobación</p>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Fee BeGreat</p>
            <p className="text-sm font-black text-[#2E1A47]">{sumBegreat(opsAprob) > 0 ? fmt(sumBegreat(opsAprob)) : "—"}</p>
          </div>
        </div>

        {/* En estudio */}
        <div className="bg-[#EEEBF3] border border-[#EEEBF3] p-6">
          <p className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-widest mb-4">Ops en estudio</p>
          <p className="text-4xl font-black text-[#2E1A47] mb-1">{opsEstudio.length}</p>
          <p className="text-[#2E1A47]/40 text-[9px] uppercase tracking-wide mb-4">pre-aprobación</p>
          <div className="border-t border-[#2E1A47]/15 pt-3">
            <p className="text-[10px] text-[#2E1A47]/50 uppercase tracking-wider mb-0.5">Fee BeGreat potencial</p>
            <p className="text-sm font-black text-[#2E1A47]">{sumBegreat(opsEstudio) > 0 ? fmt(sumBegreat(opsEstudio)) : "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Pendientes de validar ── */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">
            Pendientes de validar
            {pendientes.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px]">
                {pendientes.length}
              </span>
            )}
          </p>
          <Link href="/admin/operaciones?status=pendiente_de_validar" className="text-xs text-[#2E1A47] font-semibold hover:underline">
            Ver todas →
          </Link>
        </div>
        {pendientes8.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-300">No hay operaciones pendientes de validar.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre op.</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendientes8.map((op) => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{op.colaborador_nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{op.nombre ?? op.client_nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{op.client_nombre ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] px-2 py-0.5 font-medium">
                      {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/operaciones/${op.id}`} className="text-[#2E1A47] text-xs font-semibold hover:underline">
                      Gestionar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Ranking colaboradores ── */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Ranking de colaboradores</p>
        </div>
        {ranking.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-300">Sin datos.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">#</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nº ops</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee generada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ranking.map((c, i) => (
                <tr key={i} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3 text-xs font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{c.ops}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#2E1A47]">{c.fee > 0 ? fmt(c.fee) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
