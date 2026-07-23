// Motor del resumen de caja: ingresos, gastos, tarjetas, nóminas y caja de
// bancos mes a mes. Lo comparten la página de Caja (mes en curso) y la de
// Evolución del año. Todo en BASE sin IVA; la tarjeta, por su recibo, que es
// dinero real de banco.
import { db } from "@/db";
import { operations, tarjetaCargos, finanzasValores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getFacturasVenta, getGastos, type HoldedGasto } from "@/lib/holded";
import { getGastosFijos, esDelFijo, importeFijoMes } from "@/lib/gastosFijos";
import { getLibroDiario, type LibroLinea } from "@/lib/holdedLedger";
import { resumenTarjeta, TARJETAS, normRef, type TarjetaMes } from "@/lib/tarjetas";
import { bucketDe, type BucketVariable } from "@/lib/gastosBuckets";
import { nominasPorMes, type NominasMes } from "@/lib/nominas";

export interface MesCaja {
  m: number;
  ym: string;
  ingresos: number;
  cobrado: number;
  pendiente: number;
  porLinea: Map<string, number>;
  fijosTotal: number;
  fijosBearingBase: number;
  fijosObliviateBase: number;
  variables: number;
  porBucket: Map<BucketVariable, number>;
  nominas: number;
  nominasDet: NominasMes;
  tarjetas: number;
  salidas: number;
  neto: number;
}

export interface TarjetaCalc {
  def: (typeof TARJETAS)[number];
  resumen: TarjetaMes[];
  recibos: number[];
  enCaja: number[];
}

export interface ResumenCaja {
  holdedError: string | null;
  saldoInicial: number | null;
  meses: MesCaja[];
  cajaFinMes: number[];
  tarjetasCalc: TarjetaCalc[];
  /** Facturas de compra del año (para cruzar ops ↔ gasto real facturado). */
  gastos: HoldedGasto[];
  /** Facturas de venta del año (para cruzar ops ↔ cobros reales). */
  facturas: Awaited<ReturnType<typeof getFacturasVenta>>;
}

export async function getResumenCaja(anyoN: number): Promise<ResumenCaja> {
  let facturas: Awaited<ReturnType<typeof getFacturasVenta>> = [];
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
  const tarjetasCalc: TarjetaCalc[] = TARJETAS.map(def => {
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

  // ── Resumen de cada mes del año ──
  const meses: MesCaja[] = Array.from({ length: 12 }, (_, m) => {
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
  // Pagos reales que salieron del banco pero no tienen asiento en Holded
  // (pendientes del OK de la asesoría, Q1 declarado) + desfases menores
  // documentados en la conciliación del 22/07/2026. Los ajustes con "match"
  // se apagan solos cuando aparece en el diario un crédito por ese importe en
  // su cuenta y mes (ya contabilizado → no restar dos veces); los fijos (sin
  // match, desfases en apuntes ya conciliados) se retiran a mano si la
  // asesoría revisa Q1. Importe positivo = el mayor va por encima del banco.
  const AJUSTES_2026: { mesIdx: number; importe: number; cuenta?: string; match?: number[] }[] = [
    { mesIdx: 0, importe: 5142.5, cuenta: "57200004", match: [5142.5] },    // pago a Obliviate FR 011.2025 (13/01)
    { mesIdx: 0, importe: 275.85, cuenta: "57200004", match: [275.85] },    // liquidación VISA Laboral (01/01)
    { mesIdx: 0, importe: 610.37, cuenta: "57200004", match: [610.37] },    // Seg. Social Régimen General (30/01)
    { mesIdx: 0, importe: 103.33, cuenta: "57200003", match: [103.33] },    // liquidación VISA Clásica Bankinter (05/01)
    { mesIdx: 4, importe: 3.5, cuenta: "57200004", match: [3.5, 1413.02] }, // pico nómina abril (banco 1.413,02 / mayor 1.409,52)
    { mesIdx: 6, importe: 331.78, cuenta: "57200001", match: [331.78] },    // transferencia a Omnilink (22/07, pendiente de facturas)
    { mesIdx: 0, importe: 454.8 },                                          // desfases Sabadell enero (Rita 200+1.200, tarjeta 247,44, renting BMW −1.192,64)
    { mesIdx: 3, importe: -6.2 },                                           // desfase Sabadell abril (Vivaz Retiro)
    { mesIdx: 4, importe: -35.2 },                                          // desfases Sabadell mayo (Área de València + servicios)
    { mesIdx: 6, importe: 84.02 },                                          // desfase Sabadell julio (recibo O2 84,00 + redondeo)
  ];
  if (anyoN === 2026) for (const a of AJUSTES_2026) {
    const contabilizado = a.match && diario.some(l => l.account === a.cuenta && l.anyo === 2026 && l.mesIdx === a.mesIdx && a.match!.some(m => Math.abs(l.credit - m) < 0.01));
    if (!contabilizado) flujoBancos[a.mesIdx] -= a.importe;
  }
  let acc = 0;
  const cajaFinMes = flujoBancos.map(v => (acc += v));

  return { holdedError, saldoInicial, meses, cajaFinMes, tarjetasCalc, gastos, facturas };
}
