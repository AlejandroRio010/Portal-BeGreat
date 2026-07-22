import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { operations, tarjetaCargos, finanzasValores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getFacturasVenta, getGastos, type HoldedInvoice, type HoldedGasto } from "@/lib/holded";
import { getGastosFijos, esDelFijo, importeFijoMes } from "@/lib/gastosFijos";
import { getLibroDiario, type LibroLinea } from "@/lib/holdedLedger";
import { resumenTarjeta, TARJETAS, CATEGORIAS_TICKET, normRef } from "@/lib/tarjetas";
import { BUCKETS, bucketDe, type BucketVariable } from "@/lib/gastosBuckets";
import { nominasPorMes } from "@/lib/nominas";
import { fmtEur } from "@/lib/format";
import SaldoInicialEdit from "./SaldoInicialEdit";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const mesLabel = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${y}`; };

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const sp = await searchParams;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [anyoN, mesN] = mes.split("-").map(Number);
  const mesActualIdx = mesActual.startsWith(String(anyoN)) ? Number(mesActual.split("-")[1]) - 1 : 11;

  let facturas: HoldedInvoice[] = [];
  let gastos: HoldedGasto[] = [];
  let diario: LibroLinea[] = [];
  let holdedError: string | null = null;
  try {
    [facturas, gastos, diario] = await Promise.all([getFacturasVenta(), getGastos({ incluirBorradores: true }), getLibroDiario()]);
  } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  const [allFijos, ops, cargoRows, valores] = await Promise.all([
    getGastosFijos(),
    db.select({ id: operations.id, holded_purchases: operations.holded_purchases }).from(operations),
    db.select({ month: tarjetaCargos.month, cuenta: tarjetaCargos.cuenta, importe: tarjetaCargos.importe }).from(tarjetaCargos).where(eq(tarjetaCargos.year, anyoN)),
    db.select().from(finanzasValores).where(eq(finanzasValores.clave, `saldo_inicial_bancos_${anyoN}`)),
  ]);
  const fijosBearing = allFijos.filter(f => f.empresa === "bearing");
  const fijosObliviate = allFijos.filter(f => f.empresa === "obliviate");
  const saldoInicial = valores[0] ? Number(valores[0].valor) : null;

  // Vínculos factura de compra → operación (el vínculo manda sobre la cuenta)
  const tipoDePurchase = new Map<string, string>();
  for (const o of ops) for (const p of (o.holded_purchases as { id?: string; tipo?: string }[] | null) ?? []) {
    if (p?.id && p.tipo) tipoDePurchase.set(p.id, p.tipo);
  }
  const bucketConLink = (g: HoldedGasto): BucketVariable => {
    const t = tipoDePurchase.get(g.id);
    if (t === "pago") return "mercaderia";
    if (t === "comision") return "comisiones";
    return bucketDe(g);
  };
  const docContada = new Map<string, boolean>();
  for (const g of gastos) { const dn = normRef(g.document_number); if (dn) docContada.set(dn, bucketConLink(g) !== "tarjeta"); }
  const manual = new Map<string, number>();
  for (const r of cargoRows) manual.set(`${r.month}|${r.cuenta}`, Number(r.importe));

  // ── Tarjetas: recibo en caja por mes (mismo motor que la página de gastos) ──
  const tarjetasCalc = TARJETAS.map(def => {
    const resumen = resumenTarjeta(diario, def.cuentas, anyoN);
    for (const m of resumen) for (const tk of m.tickets) {
      if (!tk.pagaFactura && tk.ref && docContada.has(normRef(tk.ref))) { tk.pagaFactura = true; m.pagosFactura += tk.importe; m.porCategoria[tk.categoria] -= tk.importe; }
    }
    let arrastre = 0;
    const enCaja: number[] = [];
    const recibos: number[] = [];
    for (let m = 0; m < 12; m++) {
      const cargoM = manual.get(`${m + 1}|${def.cuenta}`) ?? resumen[m].cargo;
      const desc = Math.min(arrastre, cargoM);
      arrastre -= desc;
      for (const tk of resumen[m].tickets) if (tk.pagaFactura && tk.ref && (docContada.get(normRef(tk.ref)) ?? false)) arrastre += tk.importe;
      recibos.push(cargoM);
      enCaja.push(Math.max(0, cargoM - desc));
    }
    return { def, resumen, recibos, enCaja };
  });

  // Nóminas y personal por mes (del diario)
  const nominasAno = nominasPorMes(diario, anyoN);

  // ── Resumen de cada mes del año (todo en BASE sin IVA; la tarjeta, por su
  //    recibo, que es dinero real de banco) ──
  const meses = Array.from({ length: 12 }, (_, m) => {
    const ym = `${anyoN}-${String(m + 1).padStart(2, "0")}`;
    const ymKey = `${anyoN}-${m + 1}`;

    const fMes = facturas.filter(f => f.date.startsWith(ym));
    const ingresos = fMes.reduce((s, f) => s + f.subtotal, 0);
    const cobrado = fMes.reduce((s, f) => f.estado === "cobrada" ? s + f.subtotal : f.estado === "parcial" && f.total > 0 ? s + f.pagado * (f.subtotal / f.total) : s, 0);
    const pendiente = Math.max(0, ingresos - cobrado);
    const porLinea = new Map<string, number>();
    for (const f of fMes) porLinea.set(f.categoria, (porLinea.get(f.categoria) ?? 0) + f.subtotal);

    const gMes = gastos.filter(g => g.date.startsWith(ym));
    const esFijo = (g: HoldedGasto) => fijosBearing.some(f => esDelFijo(f, g.proveedor, g.contact_id, g.cuenta_id));
    const fijosBearingBase = gMes.filter(esFijo).reduce((s, g) => s + g.subtotal, 0);
    const fijosObliviateBase = fijosObliviate.reduce((s, f) => {
      const cell = f.estado_manual?.[ymKey];
      const override = typeof cell === "object" && cell ? cell.i : undefined;
      return s + (override ?? importeFijoMes(f, m));
    }, 0);
    const fijosTotal = fijosBearingBase + fijosObliviateBase;

    const variablesItems = gMes.filter(g => !esFijo(g) && bucketConLink(g) !== "tarjeta");
    const variables = variablesItems.reduce((s, g) => s + g.subtotal, 0);
    const porBucket = new Map<BucketVariable, number>();
    for (const g of variablesItems) porBucket.set(bucketConLink(g), (porBucket.get(bucketConLink(g)) ?? 0) + g.subtotal);

    const tarjetas = tarjetasCalc.reduce((s, t) => s + t.enCaja[m], 0);
    const nominas = nominasAno[m].coste;
    const salidas = fijosTotal + variables + nominas + tarjetas;
    const neto = ingresos - salidas;
    return { m, ym, ingresos, cobrado, pendiente, porLinea, fijosTotal, fijosBearingBase, fijosObliviateBase, variables, porBucket, nominas, nominasDet: nominasAno[m], tarjetas, salidas, neto };
  });

  // ── Caja de bancos a fin de mes (variación del diario + saldo inicial) ──
  // OJO: el asiento de apertura (type "opening") NO es flujo — es el saldo a 1 de
  // enero, que ya entra por el saldo inicial manual. Contarlo lo duplicaría.
  const flujoBancos = Array.from({ length: 12 }, () => 0);
  for (const l of diario) if (l.account.startsWith("57") && l.anyo === anyoN && l.type !== "opening") flujoBancos[l.mesIdx] += l.debit - l.credit;
  let acc = 0;
  const cajaFinMes = flujoBancos.map(v => (acc += v));

  const M = meses[mesN - 1];
  const ytd = meses.slice(0, mesActualIdx + 1);
  const ytdIngresos = ytd.reduce((s, x) => s + x.ingresos, 0);
  const ytdSalidas = ytd.reduce((s, x) => s + x.salidas, 0);
  const ytdNeto = ytdIngresos - ytdSalidas;
  const ytdPendiente = ytd.reduce((s, x) => s + x.pendiente, 0);
  const cajaMes = saldoInicial != null ? saldoInicial + cajaFinMes[mesN - 1] : cajaFinMes[mesN - 1];

  // Mini desglose del cargo de tarjeta: a qué se fue el gasto del MES ANTERIOR
  const desgloseTarjetas = tarjetasCalc
    .map(t => ({ def: t.def, cargo: t.enCaja[mesN - 1], prev: mesN >= 2 ? t.resumen[mesN - 2] : null }))
    .filter(t => t.cargo > 0.005);

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Caja</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Caja</h1>
          <p className="text-sm text-gray-400 mt-1">Evolución mensual del grupo · importes sin IVA (la tarjeta, por su recibo bancario)</p>
        </div>
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-2xl p-1 self-start">
          {CORTOS.map((c, i) => {
            const ym = `${anyoN}-${String(i + 1).padStart(2, "0")}`;
            const activo = ym === mes; const futuro = ym > mesActual;
            if (futuro) return <span key={c} className="px-2 py-1.5 text-[11px] font-semibold text-gray-300 select-none">{c}</span>;
            return <Link key={c} href={`/admin/finanzas/caja?mes=${ym}`}
              className={`px-2 py-1.5 text-[11px] font-semibold rounded-xl transition-colors ${activo ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"}`}>{c}</Link>;
          })}
        </div>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ingresos de {mesLabel(mes).split(" ")[0]}</p>
              <p className="text-2xl font-black text-white">{fmtEur(M.ingresos)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">cobrado {fmtEur(M.cobrado)}{M.pendiente > 0.5 ? ` · pendiente ${fmtEur(M.pendiente)}` : ""}</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastos</p>
              <p className="text-2xl font-black text-white">{fmtEur(M.salidas)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">fijos {fmtEur(M.fijosTotal)} · variables {fmtEur(M.variables)}{M.nominas > 0.5 ? ` · nóminas ${fmtEur(M.nominas)}` : ""}{M.tarjetas > 0.5 ? ` · tarjetas ${fmtEur(M.tarjetas)}` : ""}</p>
            </div>
            <div className={`px-6 py-5 border ${M.neto >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${M.neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>Neto del mes</p>
              <p className={`text-2xl font-black ${M.neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(M.neto)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">ingresos − gastos del mes</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">{saldoInicial != null ? "Caja bancos · fin de mes" : "Variación de bancos en el año"}</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(cajaMes)}</p>
              <div className="mt-1"><SaldoInicialEdit anyo={anyoN} valor={saldoInicial} /></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Ingresos por línea de negocio */}
            <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#EEEBF3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Ingresos por línea de negocio</h2>
                <Link href={`/admin/finanzas/ingresos?mes=${mes}`} className="text-xs font-semibold text-[#2E1A47] hover:underline">Ver facturas →</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {[...M.porLinea.entries()].sort((a, b) => b[1] - a[1]).map(([linea, importe]) => (
                  <div key={linea} className="px-5 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-700">{linea}</p>
                    <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(importe)}</p>
                  </div>
                ))}
                {M.porLinea.size === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">Sin facturas este mes.</p>}
              </div>
              {M.pendiente > 0.5 && (
                <div className="px-5 py-3 bg-red-50/60 border-t border-red-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-700">Pendiente de cobrar del mes</p>
                  <p className="text-sm font-black text-red-600">{fmtEur(M.pendiente)}</p>
                </div>
              )}
            </section>

            {/* Gastos del mes */}
            <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#EEEBF3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Gastos del mes</h2>
                <Link href={`/admin/finanzas/gastos?mes=${mes}`} className="text-xs font-semibold text-[#2E1A47] hover:underline">Ver detalle →</Link>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-700">Gastos fijos del grupo</p>
                    <p className="text-[11px] text-gray-400">Bearing {fmtEur(M.fijosBearingBase)} · Obliviate {fmtEur(M.fijosObliviateBase)} · <Link href="/admin/finanzas/gastos/fijos" className="text-[#2E1A47] hover:underline font-semibold">control anual →</Link></p>
                  </div>
                  <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.fijosTotal)}</p>
                </div>
                {M.nominas > 0.5 && (
                  <div className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700">Nóminas y personal</p>
                      <p className="text-[11px] text-gray-400">
                        {M.nominasDet.personas.length > 0
                          ? M.nominasDet.personas.map(p => `${p.etiqueta.split(" ")[0]} ${fmtEur(p.costeEmpresa)}`).join(" · ")
                          : "según pagos por banco"}
                        {M.nominasDet.cuotaAutonomos > 0.5 ? ` · cuota autónomos ${fmtEur(M.nominasDet.cuotaAutonomos)}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.nominas)}</p>
                  </div>
                )}
                {BUCKETS.filter(b => b.key !== "tarjeta").map(b => {
                  const v = M.porBucket.get(b.key) ?? 0;
                  if (v <= 0.5) return null;
                  return (
                    <div key={b.key} className="px-5 py-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-700">{b.label}</p>
                      <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(v)}</p>
                    </div>
                  );
                })}
                {desgloseTarjetas.map(t => (
                  <div key={t.def.cuenta} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-700">Tarjeta {t.def.banco} <span className="text-[11px] text-gray-400">· recibo del gasto de {MESES[(mesN + 10) % 12]}</span></p>
                      <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(t.cargo)}</p>
                    </div>
                    {t.prev && t.prev.gastado > 0.5 && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {CATEGORIAS_TICKET.map(c => ({ c, v: t.prev!.porCategoria[c.key] })).filter(x => x.v > 0.5)
                          .map(x => `${x.c.label} ${fmtEur(x.v)}`)
                          .concat(t.prev.pagosFactura > 0.5 ? [`Pagos de factura ${fmtEur(t.prev.pagosFactura)}`] : [])
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Evolución del año */}
          <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#2E1A47]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Evolución del año {anyoN}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EEEBF3] border-b border-gray-100">
                    {["Mes", "Ingresos", "Pendiente", "Fijos", "Variables", "Nóminas", "Tarjetas", "Neto", saldoInicial != null ? "Caja fin de mes" : "Variación bancos"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {meses.slice(0, mesActualIdx + 1).map(x => (
                    <tr key={x.ym} className={`hover:bg-[#EEEBF3]/30 ${x.ym === mes ? "bg-[#EEEBF3]/50" : ""}`}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/finanzas/caja?mes=${x.ym}`} className={`text-sm font-semibold hover:underline ${x.ym === mes ? "text-[#2E1A47]" : "text-gray-700"}`}>{CORTOS[x.m]}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{fmtEur(x.ingresos)}</td>
                      <td className={`px-4 py-3 text-xs text-right whitespace-nowrap ${x.pendiente > 0.5 ? "text-red-600 font-semibold" : "text-gray-300"}`}>{x.pendiente > 0.5 ? fmtEur(x.pendiente) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">{fmtEur(x.fijosTotal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">{fmtEur(x.variables)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">{x.nominas > 0.5 ? fmtEur(x.nominas) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">{x.tarjetas > 0.5 ? fmtEur(x.tarjetas) : "—"}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${x.neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(x.neto)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(saldoInicial != null ? saldoInicial + cajaFinMes[x.m] : cajaFinMes[x.m])}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#2E1A47]">
                    <td className="px-4 py-3.5 text-sm font-black text-white uppercase tracking-wide">YTD</td>
                    <td className="px-4 py-3.5 text-sm text-right font-black text-white whitespace-nowrap">{fmtEur(ytdIngresos)}</td>
                    <td className="px-4 py-3.5 text-xs text-right font-bold text-white/70 whitespace-nowrap">{ytdPendiente > 0.5 ? fmtEur(ytdPendiente) : "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(ytd.reduce((s, x) => s + x.fijosTotal, 0))}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(ytd.reduce((s, x) => s + x.variables, 0))}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(ytd.reduce((s, x) => s + x.nominas, 0))}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(ytd.reduce((s, x) => s + x.tarjetas, 0))}</td>
                    <td className={`px-4 py-3.5 text-sm text-right font-black whitespace-nowrap ${ytdNeto >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmtEur(ytdNeto)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-black text-[#FFC845] whitespace-nowrap">{fmtEur(saldoInicial != null ? saldoInicial + cajaFinMes[mesActualIdx] : cajaFinMes[mesActualIdx])}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Importes sin IVA (el IVA se lleva aparte para impuestos). Las tarjetas cuentan por el recibo del banco, descontando las facturas ya contadas en fijos o variables. Las nóminas salen del libro diario (asientos de nómina; si la gestoría aún no los ha pasado, lo pagado por banco). {saldoInicial == null ? "Pon el saldo inicial de los bancos a 1 de enero para ver la caja absoluta en vez de la variación." : "La caja de bancos sale del libro diario (cuentas 57x) más el saldo inicial."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
