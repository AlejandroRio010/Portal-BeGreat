import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLibroDiario } from "@/lib/holdedLedger";
import { getFacturasVenta, getGastos, type CategoriaGasto, type HoldedInvoice, type HoldedGasto } from "@/lib/holded";
import { nominasPorMes } from "@/lib/nominas";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

// Impuestos PAGADOS según el diario de Holded + estimación en vivo del
// trimestre en curso. Cuentas: 4750x = IVA (mod. 303) · 4751x = IRPF
// retenciones (mod. 111) · 473x = pagos fraccionados del IS (mod. 202) ·
// 4752x = cuota del IS (mod. 200).
type TipoImpuesto = "iva" | "irpf" | "is" | "iscuota";
function tipoDeCuenta(account: string): TipoImpuesto | null {
  if (account.startsWith("4750")) return "iva";
  if (account.startsWith("4751")) return "irpf";
  if (account.startsWith("4752")) return "iscuota";
  if (account.startsWith("473")) return "is";
  return null;
}
const ETIQUETA = { iva: "IVA (mod. 303)", irpf: "IRPF (mod. 111)", is: "Sociedades (mod. 202 y 200)" } as const;

// La cuota del IS 2025 (modelo 200) está presentada y pendiente de cargo.
const PREVISTO_IS_CUOTA = 6224;

// Deducibilidad del IVA soportado por categoría de gasto (art. 95 y 96 LIVA):
// turismos en renting → presunción de afectación al 50%; combustible, parking,
// peajes y reparaciones siguen el % del vehículo; hostelería y atenciones a
// clientes → no deducible (criterio conservador).
const REGLA_IVA: Partial<Record<CategoriaGasto, { pct: number; regla: string }>> = {
  "Vehículos (renting)": { pct: 0.5, regla: "turismos: 50% (art. 95 LIVA)" },
  "Vehículo (combustible/parking)": { pct: 0.5, regla: "sigue el % del vehículo: 50%" },
  "Dietas y restauración": { pct: 0, regla: "hostelería/atenciones: no deducible (art. 96)" },
};

// A qué liquidación corresponde un pago, por su fecha (se paga el mes siguiente
// al cierre del periodo: enero → 4T del año anterior; abril → 1T; julio → 2T;
// octubre → 3T). El 202 va por pagos: abril (1P), octubre (2P), diciembre (3P).
// La cuota del modelo 200 se carga en julio y es del ejercicio anterior.
function claveDe(fecha: string, tipo: TipoImpuesto): string {
  const [y, m] = fecha.split("-").map(Number);
  if (tipo === "iscuota") return `IS ${y - 1}`;
  if (tipo === "is") return m <= 4 ? `1P ${y}` : m <= 10 ? `2P ${y}` : `3P ${y}`;
  if (m <= 3) return `4T ${y - 1}`;
  if (m <= 6) return `1T ${y}`;
  if (m <= 9) return `2T ${y}`;
  return `3T ${y}`;
}

export default async function ImpuestosPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const trimestre = Math.floor(hoy.getMonth() / 3) + 1;
  const hoyIso = hoy.toISOString().slice(0, 10);
  const mesesDeTrim = (t: number) => [1, 2, 3].map(i => `${anyo}-${String((t - 1) * 3 + i).padStart(2, "0")}`);

  let holdedError: string | null = null;
  const pagos: { fecha: string; tipo: TipoImpuesto; importe: number; clave: string }[] = [];
  let facturas: HoldedInvoice[] = [];
  let gastos: HoldedGasto[] = [];
  let nominasAno: ReturnType<typeof nominasPorMes> = [];
  try {
    const [diario, f, g] = await Promise.all([getLibroDiario(), getFacturasVenta(), getGastos({ incluirBorradores: true })]);
    facturas = f; gastos = g;
    nominasAno = nominasPorMes(diario, anyo);
    // Un pago de impuestos = asiento que carga una cuenta de Hacienda (4750/4751/473/4752)
    // con contrapartida en banco (57x al haber).
    const asientosConBanco = new Set(diario.filter(l => l.account.startsWith("57") && l.credit > 0.005).map(l => l.entry));
    for (const l of diario) {
      const tipo = tipoDeCuenta(l.account);
      if (!tipo || l.debit <= 0.005 || !asientosConBanco.has(l.entry)) continue;
      pagos.push({ fecha: l.date, tipo, importe: l.debit, clave: claveDe(l.date, tipo) });
    }
  } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  // ── Estimaciones por trimestre (con lo registrado en Holded) ──
  const estimaIVA = (t: number) => {
    const ymList = mesesDeTrim(t);
    const en = (fecha: string) => ymList.some(ym => fecha.startsWith(ym));
    let repercutido = 0, conIva = 0, sinIva = 0, soportadoTotal = 0, deducible = 0;
    const ajustes = new Map<string, { regla: string; iva: number; perdido: number }>();
    for (const f of facturas.filter(f => en(f.date))) {
      repercutido += f.tax;
      if (f.tax > 0.005) conIva++; else sinIva++;
    }
    for (const g of gastos.filter(g => en(g.date))) {
      if (g.tax <= 0.005) continue;
      soportadoTotal += g.tax;
      const regla = REGLA_IVA[g.categoria];
      const pct = regla?.pct ?? 1;
      deducible += g.tax * pct;
      if (regla && pct < 1) {
        if (!ajustes.has(g.categoria)) ajustes.set(g.categoria, { regla: regla.regla, iva: 0, perdido: 0 });
        const a = ajustes.get(g.categoria)!;
        a.iva += g.tax; a.perdido += g.tax * (1 - pct);
      }
    }
    return { repercutido, conIva, sinIva, soportadoTotal, deducible, ajustes, resultado: repercutido - deducible };
  };
  const estimaIRPF = (t: number) => {
    const meses = nominasAno.slice((t - 1) * 3, t * 3);
    const total = meses.reduce((s, m) => s + m.irpfRetenidoMes, 0);
    const nominas = meses.reduce((s, m) => s + m.personas.reduce((x, p) => x + p.irpf, 0), 0);
    return { total, nominas, facturas: Math.max(0, total - nominas) };
  };

  const ivaAct = estimaIVA(trimestre);
  const irpfAct = estimaIRPF(trimestre);

  // Pagos agrupados por impuesto + liquidación (el 200 se junta con el 202 en el cuadro de Sociedades)
  const pagosPorClave = new Map<string, { importe: number; fechas: string[] }>();
  for (const p of pagos) {
    const cuadro = p.tipo === "iscuota" ? "is" : p.tipo;
    const k = `${cuadro}|${p.clave}`;
    if (!pagosPorClave.has(k)) pagosPorClave.set(k, { importe: 0, fechas: [] });
    const g = pagosPorClave.get(k)!;
    g.importe += p.importe;
    if (!g.fechas.includes(p.fecha)) g.fechas.push(p.fecha);
  }

  // Corroboración del último trimestre cerrado: lo que calculé vs lo pagado
  const trimPrev = trimestre - 1; // 0 = no hay (estamos en 1T)
  const corrobora = trimPrev >= 1 ? {
    trim: trimPrev,
    iva: { calculado: estimaIVA(trimPrev).resultado, pagado: pagosPorClave.get(`iva|${trimPrev}T ${anyo}`) ?? null },
    irpf: { calculado: estimaIRPF(trimPrev).total, pagado: pagosPorClave.get(`irpf|${trimPrev}T ${anyo}`) ?? null },
  } : null;

  const PERIODOS_TRIM = [
    { clave: `4T ${anyo - 1}`, label: `4T ${anyo - 1}`, vence: `${anyo}-01-30`, mesPago: "enero", previsto: 0 },
    { clave: `1T ${anyo}`, label: `1T ${anyo}`, vence: `${anyo}-04-20`, mesPago: "abril", previsto: 0 },
    { clave: `2T ${anyo}`, label: `2T ${anyo}`, vence: `${anyo}-07-20`, mesPago: "julio", previsto: 0 },
    { clave: `3T ${anyo}`, label: `3T ${anyo}`, vence: `${anyo}-10-20`, mesPago: "octubre", previsto: 0 },
    { clave: `4T ${anyo}`, label: `4T ${anyo}`, vence: `${anyo + 1}-01-30`, mesPago: `enero ${anyo + 1}`, previsto: 0 },
  ];
  const PERIODOS_IS = [
    { clave: `IS ${anyo - 1}`, label: `Cuota IS ${anyo - 1} · mod. 200`, vence: `${anyo}-07-25`, mesPago: "julio", previsto: PREVISTO_IS_CUOTA },
    { clave: `1P ${anyo}`, label: "Mod. 202 · 1er pago", vence: `${anyo}-04-20`, mesPago: "abril", previsto: 0 },
    { clave: `2P ${anyo}`, label: "Mod. 202 · 2º pago", vence: `${anyo}-10-20`, mesPago: "octubre", previsto: 0 },
    { clave: `3P ${anyo}`, label: "Mod. 202 · 3er pago", vence: `${anyo}-12-20`, mesPago: "diciembre", previsto: 0 },
  ];
  const totIva = pagos.filter(p => p.tipo === "iva").reduce((s, p) => s + p.importe, 0);
  const totIrpf = pagos.filter(p => p.tipo === "irpf").reduce((s, p) => s + p.importe, 0);
  const totIs = pagos.filter(p => p.tipo === "is" || p.tipo === "iscuota").reduce((s, p) => s + p.importe, 0);
  const fmtFecha = (f: string) => { const [y, m, d] = f.split("-"); return `${d}/${m}/${y.slice(2)}`; };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Impuestos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas — Impuestos</h1>
        <p className="text-sm text-gray-400 mt-1">Lo pagado a Hacienda según Holded · el trimestre en curso, estimado en vivo</p>
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
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Sociedades</p>
              <p className="text-2xl font-black text-white">{fmtEur(totIs)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">mod. 202 + 200{PREVISTO_IS_CUOTA > 0 && !pagosPorClave.has(`is|IS ${anyo - 1}`) ? ` · ${fmtEur(PREVISTO_IS_CUOTA)} al caer` : ""}</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">Total a Hacienda</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totIva + totIrpf + totIs)}</p>
              <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">pagado por banco este año</p>
            </div>
          </div>

          {/* Un cuadro por impuesto */}
          <div className="grid lg:grid-cols-3 gap-4">
            {([
              { tipo: "iva", titulo: ETIQUETA.iva, total: totIva, periodos: PERIODOS_TRIM },
              { tipo: "irpf", titulo: ETIQUETA.irpf, total: totIrpf, periodos: PERIODOS_TRIM },
              { tipo: "is", titulo: ETIQUETA.is, total: totIs, periodos: PERIODOS_IS },
            ] as const).map(cuadro => (
              <section key={cuadro.tipo} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-[#2E1A47]">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">{cuadro.titulo}</h2>
                </div>
                <div className="divide-y divide-gray-50 flex-1">
                  {cuadro.periodos.map(p => {
                    const pago = pagosPorClave.get(`${cuadro.tipo}|${p.clave}`);
                    const vencido = p.vence < hoyIso;
                    return (
                      <div key={p.clave} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${!pago && !vencido && !p.previsto ? "opacity-50" : ""}`}>
                        <div>
                          <p className="text-sm text-gray-700 font-medium">{p.label}</p>
                          <p className={`text-[10px] ${!pago && p.previsto ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                            {pago ? `pagado el ${pago.fechas.map(fmtFecha).join(" · ")}` : p.previsto ? "presentado · pendiente de cargo, al caer" : vencido ? "sin pago registrado en Holded" : `se paga en ${p.mesPago}`}
                          </p>
                        </div>
                        <p className={`text-sm font-bold whitespace-nowrap ${pago ? "text-[#2E1A47]" : p.previsto ? "text-amber-600" : "text-gray-300"}`}>
                          {pago ? fmtEur(pago.importe) : p.previsto ? fmtEur(p.previsto) : "—"}
                        </p>
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
            Los importes salen del libro diario de Holded (cargos a las cuentas 4750 / 4751 / 473 / 4752 con salida de banco). Cada liquidación se paga el mes siguiente al cierre del periodo; el 202 va en tres pagos (abril, octubre, diciembre) y la cuota del 200 se carga en julio. Si un pago no aparece, es que aún no está contabilizado en Holded.
          </p>

          {/* Corroboración del último trimestre cerrado */}
          {corrobora && (
            <section className="mt-8 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#EEEBF3]">
                <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">{corrobora.trim}T cerrado · mi cálculo vs lo declarado</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {([{ n: "IVA (mod. 303)", c: corrobora.iva }, { n: "IRPF (mod. 111)", c: corrobora.irpf }] as const).map(x => {
                  const dif = x.c.pagado ? x.c.pagado.importe - x.c.calculado : null;
                  const cuadra = dif != null && Math.abs(dif) <= Math.max(1, x.c.calculado * 0.02);
                  return (
                    <div key={x.n} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-700">{x.n} — yo calculé <span className="font-bold text-[#2E1A47]">{fmtEur(x.c.calculado)}</span></p>
                        <p className="text-[11px] text-gray-400">
                          {x.c.pagado
                            ? `la asesoría declaró ${fmtEur(x.c.pagado.importe)} (pagado el ${x.c.pagado.fechas.map(fmtFecha).join(" · ")})`
                            : "aún sin pago registrado — corrobóralo con la asesoría cuando llegue el cargo"}
                        </p>
                      </div>
                      {x.c.pagado ? (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cuadra ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                          {cuadra ? "✓ cuadra" : `dif ${fmtEur(Math.abs(dif!))}`}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-gray-50 text-gray-400 border border-gray-200">pendiente</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
                Si hay diferencia grande con lo declarado, lo normal es que la asesoría haya aplicado algún ajuste (prorratas, facturas fuera de plazo…) — pregúntales con este dato en la mano.
              </p>
            </section>
          )}

          {/* Estimación en vivo del trimestre en curso: IVA */}
          <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden mt-8">
            <div className="px-5 py-3.5 bg-[#EEEBF3] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">IVA del {trimestre}T {anyo} · estimación en vivo</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#2E1A47]/60 bg-white border border-[#2E1A47]/15 px-2 py-0.5 rounded-full">se liquida el 20 de {["abril", "julio", "octubre", "enero"][trimestre - 1]}</span>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">IVA repercutido (facturas de venta del trimestre)</p>
                  <p className="text-[11px] text-gray-400">{ivaAct.conIva} factura{ivaAct.conIva === 1 ? "" : "s"} con IVA{ivaAct.sinIva > 0 ? ` · ${ivaAct.sinIva} sin IVA (exportación/exentas), no suman` : ""}</p>
                </div>
                <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">+ {fmtEur(ivaAct.repercutido)}</p>
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">IVA soportado deducible (facturas de compra)</p>
                  <p className="text-[11px] text-gray-400">soportado total {fmtEur(ivaAct.soportadoTotal)}{ivaAct.ajustes.size > 0 ? ` · deducible tras reglas ${fmtEur(ivaAct.deducible)}` : ""}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700 whitespace-nowrap">− {fmtEur(ivaAct.deducible)}</p>
              </div>
              {[...ivaAct.ajustes.entries()].map(([cat, a]) => (
                <div key={cat} className="px-5 py-2.5 flex items-center justify-between gap-3 bg-amber-50/40">
                  <p className="text-[11px] text-amber-700">↳ {cat}: IVA {fmtEur(a.iva)} · {a.regla}</p>
                  <p className="text-[11px] font-semibold text-amber-700 whitespace-nowrap">{fmtEur(a.perdido)} no deducible</p>
                </div>
              ))}
              <div className="px-5 py-4 flex items-center justify-between gap-3 bg-[#FFC845]/10">
                <p className="text-sm font-bold text-[#2E1A47]">Resultado estimado del {trimestre}T {ivaAct.resultado >= 0 ? "· a pagar" : "· a compensar"}</p>
                <p className="text-xl font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(Math.abs(ivaAct.resultado))}</p>
              </div>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Estimación con lo facturado y registrado en Holded hasta hoy — irá creciendo según avance el trimestre. Reglas: renting de turismos y sus gastos (combustible, parking, peajes) deducen el 50% (art. 95 LIVA); hostelería y atenciones no deducen (art. 96). La cifra definitiva la da la asesoría con el modelo 303.
            </p>
          </section>

          {/* Estimación en vivo del trimestre en curso: IRPF */}
          <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden mt-6">
            <div className="px-5 py-3.5 bg-[#EEEBF3] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">IRPF del {trimestre}T {anyo} · estimación en vivo</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#2E1A47]/60 bg-white border border-[#2E1A47]/15 px-2 py-0.5 rounded-full">se liquida el 20 de {["abril", "julio", "octubre", "enero"][trimestre - 1]}</span>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">Retenido en nóminas</p>
                  <p className="text-[11px] text-gray-400">IRPF de las nóminas del trimestre (Maca y Rita)</p>
                </div>
                <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(irpfAct.nominas)}</p>
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">Retenido en facturas de autónomos</p>
                  <p className="text-[11px] text-gray-400">retenciones de las facturas recibidas (Pablo, Alejandro y cualquier otro autónomo que facture con retención)</p>
                </div>
                <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(irpfAct.facturas)}</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-3 bg-[#FFC845]/10">
                <p className="text-sm font-bold text-[#2E1A47]">A ingresar estimado del {trimestre}T (mod. 111)</p>
                <p className="text-xl font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(irpfAct.total)}</p>
              </div>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Suma de lo retenido en el trimestre según el diario (abonos a la cuenta 4751): nóminas + facturas de autónomos con retención. Si entra un autónomo nuevo que facture con IRPF, entra solo en el cálculo.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
