import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLibroDiario } from "@/lib/holdedLedger";
import { getFacturasVenta, getGastos, type CategoriaGasto } from "@/lib/holded";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

// Impuestos PAGADOS según el diario de Holded — nada de calcular liquidaciones:
// aquí solo se lista lo que de verdad ha salido del banco hacia Hacienda.
// Cuentas: 47500000 = IVA (mod. 303) · 47510000 = IRPF retenciones (mod. 111)
// · 47300000 = pagos fraccionados del IS (mod. 202).
const CUENTAS_IMPUESTO: Record<string, "iva" | "irpf" | "is"> = {
  "47500000": "iva",
  "47510000": "irpf",
  "47300000": "is",
};
const ETIQUETA = { iva: "IVA (mod. 303)", irpf: "IRPF (mod. 111)", is: "Sociedades (mod. 202)" } as const;

// Deducibilidad del IVA soportado por categoría de gasto (art. 95 y 96 LIVA):
// turismos en renting → presunción de afectación al 50%; combustible, parking,
// peajes y reparaciones siguen el % del vehículo; hostelería y atenciones a
// clientes → no deducible (criterio conservador).
const REGLA_IVA: Partial<Record<CategoriaGasto, { pct: number; regla: string }>> = {
  "Vehículos (renting)": { pct: 0.5, regla: "turismos: 50% (art. 95 LIVA)" },
  "Vehículo (combustible/parking)": { pct: 0.5, regla: "sigue el % del vehículo: 50%" },
  "Dietas y restauración": { pct: 0, regla: "hostelería/atenciones: no deducible (art. 96)" },
};

interface PagoImpuesto { fecha: string; tipo: "iva" | "irpf" | "is"; importe: number; clave: string }

// A qué liquidación corresponde un pago, por su fecha (se paga el mes siguiente
// al cierre del periodo: enero → 4T del año anterior; abril → 1T; julio → 2T;
// octubre → 3T). El 202 va por pagos: abril (1P), octubre (2P), diciembre (3P).
function claveDe(fecha: string, tipo: "iva" | "irpf" | "is"): string {
  const [y, m] = fecha.split("-").map(Number);
  if (tipo === "is") return m <= 4 ? `1P ${y}` : m <= 10 ? `2P ${y}` : `3P ${y}`;
  if (m <= 3) return `4T ${y - 1}`;
  if (m <= 6) return `1T ${y}`;
  if (m <= 9) return `2T ${y}`;
  return `3T ${y}`;
}

export default async function ImpuestosPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  // Trimestre en curso (para la estimación del IVA)
  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const trimestre = Math.floor(hoy.getMonth() / 3) + 1;
  const mesIni = (trimestre - 1) * 3 + 1;
  const ymDel = (m: number) => `${anyo}-${String(m).padStart(2, "0")}`;
  const mesesTrim = [ymDel(mesIni), ymDel(mesIni + 1), ymDel(mesIni + 2)];
  const enTrimestre = (fecha: string) => mesesTrim.some(ym => fecha.startsWith(ym));

  let holdedError: string | null = null;
  const pagos: PagoImpuesto[] = [];
  // Estimación IVA del trimestre en curso
  let repercutido = 0, facturasConIva = 0, facturasSinIva = 0;
  let soportadoTotal = 0, deducible = 0;
  const ajustes = new Map<string, { regla: string; iva: number; perdido: number }>();
  try {
    const [diario, facturas, gastos] = await Promise.all([getLibroDiario(), getFacturasVenta(), getGastos({ incluirBorradores: true })]);

    for (const f of facturas.filter(f => enTrimestre(f.date))) {
      repercutido += f.tax;
      if (f.tax > 0.005) facturasConIva++; else facturasSinIva++;
    }
    for (const g of gastos.filter(g => enTrimestre(g.date))) {
      if (g.tax <= 0.005) continue;
      soportadoTotal += g.tax;
      const regla = REGLA_IVA[g.categoria];
      const pct = regla?.pct ?? 1;
      deducible += g.tax * pct;
      if (regla && pct < 1) {
        if (!ajustes.has(g.categoria)) ajustes.set(g.categoria, { regla: regla.regla, iva: 0, perdido: 0 });
        const a = ajustes.get(g.categoria)!;
        a.iva += g.tax;
        a.perdido += g.tax * (1 - pct);
      }
    }
    // Un pago de impuestos = asiento que carga una cuenta de Hacienda (4750/4751/473)
    // con contrapartida en banco (57x al haber).
    const asientosConBanco = new Set(diario.filter(l => l.account.startsWith("57") && l.credit > 0.005).map(l => l.entry));
    for (const l of diario) {
      const tipo = CUENTAS_IMPUESTO[l.account];
      if (!tipo || l.debit <= 0.005 || !asientosConBanco.has(l.entry)) continue;
      pagos.push({ fecha: l.date, tipo, importe: l.debit, clave: claveDe(l.date, tipo) });
    }
  } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  // Pagos agrupados por impuesto + liquidación (clave "iva|1T 2026", etc.)
  const pagosPorClave = new Map<string, { importe: number; fechas: string[] }>();
  for (const p of pagos) {
    const k = `${p.tipo}|${p.clave}`;
    if (!pagosPorClave.has(k)) pagosPorClave.set(k, { importe: 0, fechas: [] });
    const g = pagosPorClave.get(k)!;
    g.importe += p.importe;
    if (!g.fechas.includes(p.fecha)) g.fechas.push(p.fecha);
  }

  // Periodos que muestra cada cuadro (con su fecha límite de pago)
  const hoyIso = hoy.toISOString().slice(0, 10);
  const PERIODOS_TRIM = [
    { clave: `4T ${anyo - 1}`, label: `4T ${anyo - 1}`, vence: `${anyo}-01-30`, mesPago: "enero" },
    { clave: `1T ${anyo}`, label: `1T ${anyo}`, vence: `${anyo}-04-20`, mesPago: "abril" },
    { clave: `2T ${anyo}`, label: `2T ${anyo}`, vence: `${anyo}-07-20`, mesPago: "julio" },
    { clave: `3T ${anyo}`, label: `3T ${anyo}`, vence: `${anyo}-10-20`, mesPago: "octubre" },
    { clave: `4T ${anyo}`, label: `4T ${anyo}`, vence: `${anyo + 1}-01-30`, mesPago: `enero ${anyo + 1}` },
  ];
  const PERIODOS_202 = [
    { clave: `1P ${anyo}`, label: "1er pago", vence: `${anyo}-04-20`, mesPago: "abril" },
    { clave: `2P ${anyo}`, label: "2º pago", vence: `${anyo}-10-20`, mesPago: "octubre" },
    { clave: `3P ${anyo}`, label: "3er pago", vence: `${anyo}-12-20`, mesPago: "diciembre" },
  ];
  const totIva = pagos.filter(p => p.tipo === "iva").reduce((s, p) => s + p.importe, 0);
  const totIrpf = pagos.filter(p => p.tipo === "irpf").reduce((s, p) => s + p.importe, 0);
  const totIs = pagos.filter(p => p.tipo === "is").reduce((s, p) => s + p.importe, 0);
  const fmtFecha = (f: string) => { const [y, m, d] = f.split("-"); return `${d}/${m}/${y.slice(2)}`; };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Impuestos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas — Impuestos</h1>
        <p className="text-sm text-gray-400 mt-1">Lo pagado de verdad a Hacienda según Holded · nada de estimaciones</p>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* Totales del año */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">IVA pagado</p>
              <p className="text-2xl font-black text-white">{fmtEur(totIva)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">modelo 303</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">IRPF pagado</p>
              <p className="text-2xl font-black text-white">{fmtEur(totIrpf)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">modelo 111 · retenciones</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Sociedades a cuenta</p>
              <p className="text-2xl font-black text-white">{fmtEur(totIs)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">modelo 202 · pagos fraccionados</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">Total a Hacienda</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totIva + totIrpf + totIs)}</p>
              <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">pagado por banco este año</p>
            </div>
          </div>

          {/* Un cuadro por impuesto: IVA, IRPF y modelo 202 */}
          <div className="grid lg:grid-cols-3 gap-4">
            {([
              { tipo: "iva" as const, titulo: ETIQUETA.iva, total: totIva, periodos: PERIODOS_TRIM },
              { tipo: "irpf" as const, titulo: ETIQUETA.irpf, total: totIrpf, periodos: PERIODOS_TRIM },
              { tipo: "is" as const, titulo: ETIQUETA.is, total: totIs, periodos: PERIODOS_202 },
            ]).map(cuadro => (
              <section key={cuadro.tipo} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-[#2E1A47]">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">{cuadro.titulo}</h2>
                </div>
                <div className="divide-y divide-gray-50 flex-1">
                  {cuadro.periodos.map(p => {
                    const pago = pagosPorClave.get(`${cuadro.tipo}|${p.clave}`);
                    const vencido = p.vence < hoyIso;
                    return (
                      <div key={p.clave} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${!pago && !vencido ? "opacity-50" : ""}`}>
                        <div>
                          <p className="text-sm text-gray-700 font-medium">{p.label}</p>
                          <p className="text-[10px] text-gray-400">
                            {pago ? `pagado el ${pago.fechas.map(fmtFecha).join(" · ")}` : vencido ? "sin pago registrado en Holded" : `se paga en ${p.mesPago}`}
                          </p>
                        </div>
                        <p className={`text-sm font-bold whitespace-nowrap ${pago ? "text-[#2E1A47]" : "text-gray-300"}`}>{pago ? fmtEur(pago.importe) : "—"}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 bg-[#EEEBF3] flex items-center justify-between">
                  <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wide">Total pagado</p>
                  <p className="text-sm font-black text-[#2E1A47]">{fmtEur(cuadro.total)}</p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Los importes salen del libro diario de Holded (cargos a las cuentas 4750 / 4751 / 473 con salida de banco). Cada liquidación se paga el mes siguiente al cierre del periodo: 4T en enero, 1T en abril, 2T en julio y 3T en octubre. El modelo 202 va en tres pagos: abril, octubre y diciembre. Si un pago no aparece, es que aún no está contabilizado en Holded.
          </p>

          {/* IVA del trimestre en curso — estimación en vivo */}
          <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden mt-8">
            <div className="px-5 py-3.5 bg-[#EEEBF3] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">IVA del {trimestre}T {anyo} · estimación en vivo</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#2E1A47]/60 bg-white border border-[#2E1A47]/15 px-2 py-0.5 rounded-full">se liquida el 20 de {["abril", "julio", "octubre", "enero"][trimestre - 1]}</span>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">IVA repercutido (facturas de venta del trimestre)</p>
                  <p className="text-[11px] text-gray-400">{facturasConIva} factura{facturasConIva === 1 ? "" : "s"} con IVA{facturasSinIva > 0 ? ` · ${facturasSinIva} sin IVA (exportación/exentas), no suman` : ""}</p>
                </div>
                <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">+ {fmtEur(repercutido)}</p>
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">IVA soportado deducible (facturas de compra)</p>
                  <p className="text-[11px] text-gray-400">soportado total {fmtEur(soportadoTotal)}{ajustes.size > 0 ? ` · deducible tras reglas ${fmtEur(deducible)}` : ""}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700 whitespace-nowrap">− {fmtEur(deducible)}</p>
              </div>
              {[...ajustes.entries()].map(([cat, a]) => (
                <div key={cat} className="px-5 py-2.5 flex items-center justify-between gap-3 bg-amber-50/40">
                  <p className="text-[11px] text-amber-700">↳ {cat}: IVA {fmtEur(a.iva)} · {a.regla}</p>
                  <p className="text-[11px] font-semibold text-amber-700 whitespace-nowrap">{fmtEur(a.perdido)} no deducible</p>
                </div>
              ))}
              <div className="px-5 py-4 flex items-center justify-between gap-3 bg-[#FFC845]/10">
                <p className="text-sm font-bold text-[#2E1A47]">Resultado estimado del {trimestre}T {repercutido - deducible >= 0 ? "· a pagar" : "· a compensar"}</p>
                <p className="text-xl font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(Math.abs(repercutido - deducible))}</p>
              </div>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Estimación con lo facturado y registrado en Holded hasta hoy — irá creciendo según avance el trimestre. Reglas aplicadas al IVA soportado: renting de turismos y sus gastos (combustible, parking, peajes) deducen el 50% (art. 95 LIVA); hostelería y atenciones a clientes no deducen (art. 96). La cifra definitiva la da la asesoría con el modelo 303.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
