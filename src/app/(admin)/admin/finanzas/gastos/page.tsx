import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { getGastos, type HoldedGasto, CATEGORIAS_GASTO } from "@/lib/holded";
import { getGastosFijos, esDelFijo, norm, importeFijoMes, conIva } from "@/lib/gastosFijos";
import { BUCKETS, bucketDe } from "@/lib/gastosBuckets";
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

  // Mapa factura de compra → operación que la tiene ligada (comisiones / mercadería)
  const ops = await db.select({ id: operations.id, nombre: operations.nombre, holded_purchases: operations.holded_purchases }).from(operations);
  const opDePurchase = new Map<string, { id: string; nombre: string }>();
  for (const o of ops) {
    for (const p of (o.holded_purchases as { id?: string }[] | null) ?? []) {
      if (p?.id) opDePurchase.set(p.id, { id: o.id, nombre: o.nombre ?? "Operación" });
    }
  }

  const fijosDef = await getGastosFijos();
  const fijosBearing = fijosDef.filter(f => f.empresa === "bearing");   // cruzan con Holded
  const fijosObliviate = fijosDef.filter(f => f.empresa === "obliviate"); // manuales
  const esFijo = (g: HoldedGasto) => fijosBearing.some(f => esDelFijo(f, g.proveedor, g.contact_id));
  const mesIdx = Number(mes.split("-")[1]) - 1;
  const ymKey = `${Number(mes.split("-")[0])}-${mesIdx + 1}`;
  // Fijos de Obliviate que aplican a este mes (mensuales siempre; anuales solo en su
  // mes), respetando el override de importe manual si lo hay.
  // Importes de Obliviate en base (sin IVA); la caja suma con IVA (como Bearing)
  const obliviateMes = fijosObliviate.map(f => {
    const cell = f.estado_manual?.[ymKey];
    const override = typeof cell === "object" && cell ? cell.i : undefined;
    const base = override ?? importeFijoMes(f, mesIdx);
    // Sin marca explícita: se asume pagado si el mes ya pasó o es el actual
    const estadoDefault = mes <= mesActual ? "pagada" : "pendiente";
    const estado = (typeof cell === "string" ? cell : cell?.e) ?? estadoDefault;
    return { f, base, total: conIva(base), estado };
  }).filter(x => x.base > 0);
  const totalObliviate = obliviateMes.reduce((s, x) => s + x.total, 0);
  const baseObliviate = obliviateMes.reduce((s, x) => s + x.base, 0);

  const delMes = gastos.filter(g => g.date.startsWith(mes));
  const fijos = delMes.filter(esFijo);
  const variables = delMes.filter(g => !esFijo(g));
  const baseMes = delMes.reduce((s, g) => s + g.subtotal, 0);
  const ivaMes = delMes.reduce((s, g) => s + g.tax, 0);
  const totalMes = delMes.reduce((s, g) => s + g.total, 0);
  const totalFijos = fijos.reduce((s, g) => s + g.total, 0);
  const totalVariables = variables.reduce((s, g) => s + g.total, 0);
  const pendiente = delMes.filter(g => g.estado !== "pagada").reduce((s, g) => s + g.pendiente, 0);
  const retencion = delMes.reduce((s, g) => s + g.retencion, 0);

  // Fijos del mes agrupados por proveedor fijo (solo Bearing, que cruza con Holded)
  const fijosMes = fijosBearing.map(f => {
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
          {["Fecha", "Proveedor", "Concepto", "Categoría", "Base", "IVA", "IRPF", "Total", "F. pago", "Estado"].map(h => (
            <th key={h} className={`px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider ${["Base", "IVA", "IRPF", "Total"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {lista.map(g => { const b = BADGE[g.estado]; return (
            <tr key={g.id} className="hover:bg-[#EEEBF3]/30">
              <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(g.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</td>
              <td className="px-3 py-3 max-w-[180px]">
                <a href={holdedUrl(g.id)} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-gray-800 hover:text-[#2E1A47] hover:underline truncate" title={g.proveedor}>{g.proveedor}</a>
                {opDePurchase.get(g.id) && (
                  <a href={`/admin/operaciones/${opDePurchase.get(g.id)!.id}`} className="block text-[10px] font-semibold text-[#2E1A47] hover:underline truncate" title={opDePurchase.get(g.id)!.nombre}>🔗 {opDePurchase.get(g.id)!.nombre}</a>
                )}
              </td>
              <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate" title={g.description ?? undefined}>{g.description ?? "—"}</td>
              <td className="px-3 py-3"><span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap">{g.categoria}</span></td>
              <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap">{fmtEur(g.subtotal)}</td>
              <td className="px-3 py-3 text-xs text-gray-400 text-right whitespace-nowrap">{g.tax > 0 ? fmtEur(g.tax) : "—"}</td>
              <td className="px-3 py-3 text-xs text-amber-600 text-right whitespace-nowrap">{g.retencion > 0 ? `−${fmtEur(g.retencion)}` : "—"}</td>
              <td className="px-3 py-3 text-sm font-bold text-[#2E1A47] text-right whitespace-nowrap">{fmtEur(g.total)}</td>
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
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastado en {mesLabel(mes).split(" ")[0]} · sin IVA</p>
              <p className="text-2xl font-black text-white">{fmtEur(baseMes + baseObliviate)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">+ IVA {fmtEur(ivaMes + (totalObliviate - baseObliviate))} · total {fmtEur(totalMes + totalObliviate)}</p>
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

          {/* Gastos fijos del mes — Bearing (izq) · Obliviate (der), compacto */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Gastos fijos de {mesLabel(mes)}</h2>
              <AddGastoFijoButton candidatos={candidatos} categorias={CATEGORIAS_GASTO} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Bearing */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-[#EEEBF3]/60 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#2E1A47] uppercase tracking-wider">Bearing</p>
                  <span className="text-[10px] text-gray-400">Holded · {fmtEur(totalFijos)}</span>
                </div>
                {fijosMes.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">Sin fijos este mes.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {fijosMes.map(({ f, facts, total, pagado }) => (
                      <a key={f.id} href={holdedUrl(facts[0].id)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-[#EEEBF3]/30">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pagado ? "bg-emerald-500" : "bg-amber-400"}`} title={pagado ? "pagado" : "sin pagar"} />
                          <span className="text-xs font-medium text-gray-700 truncate">{f.label}</span>
                        </span>
                        <span className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(total)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {/* Obliviate */}
              <div className="bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-amber-50 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">🏢 Obliviate</p>
                  <span className="text-[10px] text-amber-600">manual · {fmtEur(totalObliviate)} c/IVA</span>
                </div>
                {obliviateMes.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">Sin fijos este mes.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {obliviateMes.map(({ f, base, total, estado }) => {
                      const dot = estado === "pagada" ? "bg-emerald-500" : estado === "recibida" ? "bg-amber-400" : "bg-gray-300";
                      return (
                        <div key={f.id} className="flex items-center justify-between gap-2 px-4 py-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} title={estado === "pagada" ? "pagado" : estado === "recibida" ? "factura recibida" : "sin marcar"} />
                            <span className="text-xs font-medium text-gray-700 truncate">{f.label}</span>
                          </span>
                          <span className="text-xs font-bold text-amber-800 whitespace-nowrap" title={`${fmtEur(base)} + IVA`}>{fmtEur(total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gastos variables del mes, por tipo */}
          <div>
            <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Gastos variables de {mesLabel(mes)} · {fmtEur(totalVariables)}</h2>
            {variables.length === 0 ? (
              <div className="bg-white border border-gray-100 shadow-sm py-14 text-center"><p className="text-sm text-gray-400">Sin gastos variables este mes.</p></div>
            ) : (
              <div className="space-y-6">
                {BUCKETS.map(b => {
                  const items = variables.filter(g => bucketDe(g) === b.key);
                  if (items.length === 0) return null;
                  const sub = items.reduce((s, g) => s + g.total, 0);
                  return (
                    <div key={b.key}>
                      <div className="flex items-end justify-between mb-2 gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg leading-none">{b.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#2E1A47]">{b.label}</p>
                            <p className="text-[11px] text-gray-400 truncate">{b.desc}{b.nota ? ` · ${b.nota}` : ""}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(sub)} <span className="text-[10px] text-gray-400 font-normal">· {items.length}</span></p>
                      </div>

                      {b.key === "tarjeta" ? (
                        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                          <span className="text-base">💳</span>
                          <p className="text-xs text-amber-700"><b>{items.length} cargos</b> por {fmtEur(sub)} — lo detallamos mañana (dietas, combustible, parking).</p>
                        </div>
                      ) : (
                        <>
                          {b.key === "nomina" && (
                            <div className="bg-[#EEEBF3]/60 border border-[#2E1A47]/10 rounded-t-2xl px-4 py-2 text-[11px] text-[#2E1A47]/70">
                              ⓘ Aquí solo entra lo que Holded registra como compra (Seguridad Social, gestoría). Los <b>sueldos netos de Rita y Macarena no están en Holded</b> — <b>pendiente (mañana)</b>: los metemos como importe mensual para que se vean aquí.
                            </div>
                          )}
                          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">{filaGastos(items)}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
