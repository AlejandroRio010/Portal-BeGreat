import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGastos, type HoldedGasto, CATEGORIAS_GASTO } from "@/lib/holded";
import { getGastosFijos, esDelFijo, norm } from "@/lib/gastosFijos";
import { fmtEur } from "@/lib/format";
import { AddGastoFijoButton, type CandidatoProveedor } from "./GastosFijosManage";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const holdedUrl = (id: string) => `https://app.holded.com/expenses/list#open:purchase-${id}`;
function mesLabel(ym: string) { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${y}`; }

const BADGE: Record<HoldedGasto["estado"], { c: string; l: string }> = {
  pagada: { c: "bg-emerald-50 border border-emerald-200 text-emerald-700", l: "Pagada ✓" },
  parcial: { c: "bg-amber-50 border border-amber-200 text-amber-700", l: "Parcial" },
  pendiente: { c: "bg-red-50 border border-red-200 text-red-600", l: "Pendiente" },
};

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string; tipo?: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const sp = await searchParams;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActual;

  let gastos: HoldedGasto[] = [];
  let holdedError: string | null = null;
  try { gastos = await getGastos({ incluirBorradores: true }); } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  const fijosDef = await getGastosFijos();
  const esFijo = (g: HoldedGasto) => fijosDef.some(f => esDelFijo(f, g.proveedor, g.contact_id));

  const delMes = gastos.filter(g => g.date.startsWith(mes));
  const fijos = delMes.filter(esFijo);
  const variables = delMes.filter(g => !esFijo(g));
  const totalMes = delMes.reduce((s, g) => s + g.total, 0);
  const totalFijos = fijos.reduce((s, g) => s + g.total, 0);
  const totalVariables = variables.reduce((s, g) => s + g.total, 0);
  const pendiente = delMes.filter(g => g.estado !== "pagada").reduce((s, g) => s + g.pendiente, 0);
  const retencion = delMes.reduce((s, g) => s + g.retencion, 0);

  // Fijos del mes agrupados por proveedor fijo
  const fijosMes = fijosDef.map(f => {
    const facts = delMes.filter(g => esDelFijo(f, g.proveedor, g.contact_id));
    return { f, facts, total: facts.reduce((s, g) => s + g.total, 0), pagado: facts.length > 0 && facts.every(g => g.estado === "pagada"), presente: facts.length > 0 };
  }).filter(x => x.presente);

  // Candidatos para "añadir gasto fijo": proveedores vistos (dedup), con su última factura
  const candMap = new Map<string, CandidatoProveedor>();
  for (const g of gastos) {
    const key = g.contact_id ?? norm(g.proveedor);
    const prev = candMap.get(key);
    if (!prev) candMap.set(key, { proveedor: g.proveedor, contactId: g.contact_id, categoria: g.categoria, importe: g.total, fecha: g.date, n: 1, yaFijo: esFijo(g) });
    else { prev.n++; if (g.date > prev.fecha) { prev.fecha = g.date; prev.importe = g.total; prev.categoria = g.categoria; } }
  }
  const candidatos = [...candMap.values()];

  const anyo = Number(mes.split("-")[0]);
  const filaGastos = (lista: HoldedGasto[]) => (
    <div className="overflow-x-auto" style={{ zoom: 0.85 }}>
      <table className="w-full">
        <thead><tr className="bg-[#EEEBF3] border-b border-gray-100">
          {["Fecha", "Proveedor", "Concepto", "Categoría", "Retención", "Total", "F. pago", "Estado"].map(h => (
            <th key={h} className="text-left px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {lista.map(g => { const b = BADGE[g.estado]; return (
            <tr key={g.id} className="hover:bg-[#EEEBF3]/30">
              <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(g.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</td>
              <td className="px-3 py-3 text-sm font-semibold text-gray-800 max-w-[160px] truncate" title={g.proveedor}>
                <a href={holdedUrl(g.id)} target="_blank" rel="noopener noreferrer" className="hover:text-[#2E1A47] hover:underline">{g.proveedor}</a>
              </td>
              <td className="px-3 py-3 text-xs text-gray-500 max-w-[170px] truncate" title={g.description ?? undefined}>{g.description ?? "—"}</td>
              <td className="px-3 py-3"><span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap">{g.categoria}</span></td>
              <td className="px-3 py-3 text-xs text-amber-600 whitespace-nowrap">{g.retencion > 0 ? `−${fmtEur(g.retencion)}` : "—"}</td>
              <td className="px-3 py-3 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(g.total)}</td>
              <td className="px-3 py-3 text-xs text-emerald-700 font-semibold whitespace-nowrap">{g.fecha_pago ? new Date(g.fecha_pago).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}</td>
              <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.c}`}>{b.l}</span></td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Gastos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Gastos</h1>
          <p className="text-sm text-gray-400 mt-1">Bearing Point S.L. · desde Holded · todo lo que veas aquí está ya en tu contabilidad</p>
          <Link href="/admin/finanzas/gastos/fijos" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#2E1A47] hover:underline">📌 Control anual de gastos fijos →</Link>
        </div>
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-2xl p-1 self-start">
          {CORTOS.map((m, i) => {
            const ym = `${anyo}-${String(i + 1).padStart(2, "0")}`;
            const activo = ym === mes; const futuro = ym > mesActual;
            if (futuro) return <span key={m} className="px-2 py-1.5 text-[11px] font-semibold text-gray-300 select-none">{m}</span>;
            return <Link key={m} href={`/admin/finanzas/gastos?mes=${ym}`}
              className={`px-2 py-1.5 text-[11px] font-semibold rounded-xl transition-colors ${activo ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"}`}>{m}</Link>;
          })}
        </div>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastado en {mesLabel(mes).split(" ")[0]}</p>
              <p className="text-2xl font-black text-white">{fmtEur(totalMes)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">{delMes.length} factura{delMes.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white border border-gray-200 px-6 py-5">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastos fijos</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalFijos)}</p>
            </div>
            <div className="bg-white border border-gray-200 px-6 py-5">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastos variables</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalVariables)}</p>
            </div>
            <div className="bg-white border border-red-200 px-6 py-5">
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pendiente de pago</p>
              <p className="text-2xl font-black text-red-600">{fmtEur(pendiente)}</p>
              {retencion > 0 && <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">IRPF retenido: {fmtEur(retencion)}</p>}
            </div>
          </div>

          {/* Gastos fijos del mes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Gastos fijos de {mesLabel(mes)}</h2>
              <AddGastoFijoButton candidatos={candidatos} categorias={CATEGORIAS_GASTO} />
            </div>
            {fijosMes.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white border border-gray-100 px-5 py-4">Ningún gasto fijo registrado este mes todavía.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {fijosMes.map(({ f, facts, total, pagado }) => (
                  <a key={f.id} href={holdedUrl(facts[0].id)} target="_blank" rel="noopener noreferrer"
                    className={`rounded-2xl border px-4 py-3 transition-all hover:shadow-sm ${pagado ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800 truncate">{f.label}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${pagado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{pagado ? "Pagado" : "Sin pagar"}</span>
                    </div>
                    <p className="text-lg font-black text-[#2E1A47] mt-1">{fmtEur(total)}{facts.length > 1 ? <span className="text-[10px] text-gray-400 font-normal"> · {facts.length} fact.</span> : null}</p>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Gastos variables del mes */}
          <div>
            <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Gastos variables de {mesLabel(mes)} · {fmtEur(totalVariables)}</h2>
            <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
              {variables.length === 0 ? (
                <div className="py-14 text-center"><p className="text-sm text-gray-400">Sin gastos variables este mes.</p></div>
              ) : filaGastos(variables)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
