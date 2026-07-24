import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { operations, tarjetaCargos, obliviateMovs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getGastos, type HoldedGasto } from "@/lib/holded";
import { getGastosFijos, esDelFijo, importeFijoMes, conIva, construirCandidatos } from "@/lib/gastosFijos";
import { getLibroDiario, type LibroLinea } from "@/lib/holdedLedger";
import { resumenTarjeta, TARJETAS, CATEGORIAS_TICKET, normRef, categoriaTicket, type TarjetaMes } from "@/lib/tarjetas";
import { nominasPorMes, irpfTrimestreHasta } from "@/lib/nominas";
import { getCategoriasGasto } from "@/lib/categorias";
import { BUCKETS, bucketDe } from "@/lib/gastosBuckets";
import { fmtEur } from "@/lib/format";
import { AddGastoFijoButton, CargoTarjetaEdit } from "./GastosFijosManage";

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
  let diario: LibroLinea[] = [];
  let holdedError: string | null = null;
  try { gastos = await getGastos({ incluirBorradores: true }); } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }
  try { diario = await getLibroDiario(); } catch { /* si falla el diario, la tarjeta cae a manual */ }

  // Mapa factura de compra → operación que la tiene ligada, con el tipo de vínculo
  // ("pago" = compra de mercadería, "comision" = comisión de colaborador)
  const ops = await db.select({ id: operations.id, nombre: operations.nombre, holded_purchases: operations.holded_purchases }).from(operations);
  const opDePurchase = new Map<string, { id: string; nombre: string; tipo?: string }>();
  for (const o of ops) {
    for (const p of (o.holded_purchases as { id?: string; tipo?: string }[] | null) ?? []) {
      if (p?.id) opDePurchase.set(p.id, { id: o.id, nombre: o.nombre ?? "Operación", tipo: p.tipo });
    }
  }
  // El vínculo a la operación manda sobre la cuenta contable: una factura ligada
  // como pago de mercadería cae en su cajón aunque la cuenta no esté mapeada.
  const bucketConLink = (g: HoldedGasto) => {
    const link = opDePurchase.get(g.id);
    if (link?.tipo === "pago") return "mercaderia";
    if (link?.tipo === "comision") return "comisiones";
    return bucketDe(g);
  };

  // ── Tarjetas de crédito: mecanismo ÚNICO para las 3 (da igual qué tarjeta se
  // use para qué). Del diario, por la cuenta 52x de cada una:
  //  · Recibo del mes (a mes vencido: cubre el gasto del mes anterior) → caja.
  //  · Cada movimiento se clasifica: ticket (lo cuenta la tarjeta) o pago de
  //    factura registrada. Si esa factura ya cuenta en fijos/variables, su parte
  //    se DESCUENTA del recibo en caja (así Microsoft por Bankinter no duplica);
  //    si la factura es del cajón tarjeta (gasolina…), la cubre el recibo.
  const [anyoN, mesN] = mes.split("-").map(Number);
  // Nº de documento de cada compra → ¿cuenta en el lado de facturas?
  const docContada = new Map<string, boolean>();
  for (const g of gastos) {
    const dn = normRef(g.document_number);
    if (dn) docContada.set(dn, bucketConLink(g) !== "tarjeta");
  }
  // Cargos manuales por tarjeta y mes (tabla tarjeta_cargos): completan o
  // corrigen el recibo cuando la contabilidad no lo tiene (p. ej. marzo 2026,
  // cuya conciliación bancaria quedó incompleta).
  const cargoRows = await db.select({ month: tarjetaCargos.month, cuenta: tarjetaCargos.cuenta, importe: tarjetaCargos.importe })
    .from(tarjetaCargos).where(eq(tarjetaCargos.year, anyoN));
  const cargoManualDe = new Map<string, number>();
  for (const r of cargoRows) cargoManualDe.set(`${r.month}|${r.cuenta}`, Number(r.importe));

  const MES_TARJETA_VACIO: TarjetaMes = { mesIdx: mesN - 1, cargo: 0, gastado: 0, pagosFactura: 0, tickets: [], porCategoria: { gasolina: 0, parking: 0, dietas: 0 } };
  const tarjetas = TARJETAS.map((def, idx) => {
    const resumen = resumenTarjeta(diario, def.cuentas, anyoN);
    // Refuerzo: si el concepto del movimiento lleva el nº de una factura
    // registrada en Holded, es un pago de factura aunque el asiento no toque
    // la cuenta 40x del proveedor (pasa en las conciliaciones del banco).
    for (const m of resumen) {
      for (const tk of m.tickets) {
        if (!tk.pagaFactura && tk.ref && docContada.has(normRef(tk.ref))) {
          tk.pagaFactura = true;
          m.pagosFactura += tk.importe;
          m.porCategoria[tk.categoria] -= tk.importe;
        }
      }
    }
    const mesData = resumen[mesN - 1] ?? MES_TARJETA_VACIO;
    // Descuento con ARRASTRE: los pagos de facturas ya contadas (fijos/variables)
    // hechos con la tarjeta se descuentan del siguiente recibo que llegue (los
    // ciclos del banco no siempre van mes a mes exactos).
    let arrastre = 0;
    let descuentoMes = 0;
    for (let m = 0; m < mesN; m++) {
      const datos = resumen[m];
      // El cargo del mes en el recorrido incluye el manual si lo hay
      const cargoM = cargoManualDe.get(`${m + 1}|${def.cuenta}`) ?? datos.cargo;
      const descuento = Math.min(arrastre, cargoM);
      if (m === mesN - 1) descuentoMes = descuento;
      arrastre -= descuento;
      for (const tk of datos.tickets) {
        if (tk.pagaFactura && tk.ref && (docContada.get(normRef(tk.ref)) ?? false)) arrastre += tk.importe;
      }
    }
    const esSabadell = idx === 0;
    const cargoAuto = mesData.cargo;
    const manual = cargoManualDe.get(`${mesN}|${def.cuenta}`) ?? null;
    const recibo = manual ?? cargoAuto;
    const facturasContadas = Math.min(descuentoMes, recibo);
    const enCaja = Math.max(0, recibo - facturasContadas);
    const actividad = resumen.some(m => m.cargo > 0.005 || m.tickets.length > 0) || cargoRows.some(r => r.cuenta === def.cuenta);
    // Gasto del mes anterior: si lo hubo y este mes no aparece recibo, algo falta
    // en la contabilidad (el banco cobra a mes vencido sí o sí).
    const gastadoPrev = mesN >= 2 ? resumen[mesN - 2]?.gastado ?? 0 : 0;
    return { def, resumen, mesData, cargoAuto, manual, recibo, facturasContadas, enCaja, esSabadell, actividad, gastadoPrev };
  });
  // Lo que las tarjetas suman en caja este mes (recibos menos facturas ya contadas)
  const cargoTarjeta = tarjetas.reduce((s, t) => s + t.enCaja, 0);

  // Nóminas y personal del mes, del libro diario (asientos de nómina + pagos)
  const nominasAno = nominasPorMes(diario, anyoN);
  const nominasMes = nominasAno[mesN - 1];
  const irpfTrimestre = irpfTrimestreHasta(nominasAno, mesN - 1);
  const trimestreN = Math.floor((mesN - 1) / 3) + 1;

  // Facturas del mes del cajón tarjeta (gasolina, parking…) que AÚN no están
  // conciliadas como movimiento en ninguna cuenta 52x: se enseñan ya como
  // gastado del mes (con su categoría) en la Sabadell —la tarjeta de gastos—.
  // Dedup por nº de documento: cuando la conciliación las coloque, desaparecen
  // de aquí y quedan como movimiento. No suman en caja (eso lo hace el recibo).
  // Dedup contra los movimientos de TODO el año (una factura puede conciliarse
  // como movimiento en un mes distinto al de su fecha, p. ej. factura 1-jul
  // conciliada el 30-jun): si ya existe como movimiento, no se vuelve a añadir.
  const refsEnTarjetas = new Set<string>();
  for (const t of tarjetas) for (const m of t.resumen) for (const tk of m.tickets) if (tk.ref) refsEnTarjetas.add(normRef(tk.ref));
  const sab = tarjetas[0];
  for (const g of gastos) {
    if (!g.date.startsWith(mes) || bucketConLink(g) !== "tarjeta") continue;
    const ref = normRef(g.document_number);
    if (ref && refsEnTarjetas.has(ref)) continue;
    const categoria = categoriaTicket(`${g.proveedor} ${g.description ?? ""}`);
    sab.mesData.tickets.push({
      date: g.date, mesIdx: mesN - 1, desc: `${g.proveedor}${g.description ? ` · ${g.description}` : ""}`,
      importe: g.total, categoria, pagaFactura: false, ref: ref || null, esFactura: true,
    });
    sab.mesData.gastado += g.total;
    sab.mesData.porCategoria[categoria] += g.total;
  }
  sab.mesData.tickets.sort((a, b) => b.importe - a.importe);
  // La tarjeta se cobra A MES VENCIDO: el recibo de un mes cubre el gasto del mes
  // anterior. Meses pasados (≤ jun 2026): solo el recibo, sin desglose retroactivo.
  // Desde julio 2026: minisección "Gastado en el mes" por categorías, alimentada
  // por la conciliación semanal de los movimientos (se cobrará al mes siguiente).
  const verDetalleTarjeta = mes >= "2026-07";
  const mesAnteriorNombre = MESES[(mesN + 10) % 12];  // nombre del mes anterior
  const mesSiguienteNombre = MESES[mesN % 12];        // nombre del mes siguiente

  const fijosDef = await getGastosFijos();
  const categoriasGasto = await getCategoriasGasto();
  const fijosBearing = fijosDef.filter(f => f.empresa === "bearing");   // cruzan con Holded
  const fijosObliviate = fijosDef.filter(f => f.empresa === "obliviate"); // manuales
  const esFijo = (g: HoldedGasto) => fijosBearing.some(f => esDelFijo(f, g.proveedor, g.contact_id, g.cuenta_id));
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

  // Gastos de Obliviate por banco este mes (bruto, con IVA) — SOLO informativo:
  // no entran en las sumas de esta página (ya cuentan en la caja del grupo).
  // Los fijos y el intragrupo se excluyen (los fijos ya están arriba).
  const CATS_GASTO_OBLIVIATE = ["comision", "tarjeta", "impuestos", "efectivo", "otros"];
  const gastosObliviateBanco = (await db.select().from(obliviateMovs))
    .filter(m => m.fecha.startsWith(mes) && Number(m.importe) < 0 && CATS_GASTO_OBLIVIATE.includes(m.categoria))
    .reduce((s, m) => s + -Number(m.importe), 0);

  const delMes = gastos.filter(g => g.date.startsWith(mes));
  const esTarjeta = (g: HoldedGasto) => bucketConLink(g) === "tarjeta";
  const fijos = delMes.filter(esFijo);
  // Las variables NO incluyen la tarjeta (esa cuenta por su cargo global, no por factura)
  const variables = delMes.filter(g => !esFijo(g) && !esTarjeta(g));
  // Base/IVA/total solo de lo que cuenta por factura (sin tarjeta)
  const contados = delMes.filter(g => !esTarjeta(g));
  const baseMes = contados.reduce((s, g) => s + g.subtotal, 0);
  const ivaMes = contados.reduce((s, g) => s + g.tax, 0);
  const totalContados = contados.reduce((s, g) => s + g.total, 0);
  const totalFijos = fijos.reduce((s, g) => s + g.total, 0);
  const totalVariables = variables.reduce((s, g) => s + g.total, 0) + cargoTarjeta;
  const pendiente = contados.filter(g => g.estado !== "pagada").reduce((s, g) => s + g.pendiente, 0);
  const retencion = contados.reduce((s, g) => s + g.retencion, 0);

  // Fijos del mes agrupados por proveedor fijo (solo Bearing, que cruza con Holded)
  const fijosMes = fijosBearing.map(f => {
    const facts = delMes.filter(g => esDelFijo(f, g.proveedor, g.contact_id, g.cuenta_id));
    return { f, facts, total: facts.reduce((s, g) => s + g.total, 0), pagado: facts.length > 0 && facts.every(g => g.estado === "pagada"), presente: facts.length > 0 };
  }).filter(x => x.presente);

  // Candidatos para "añadir gasto fijo" (con desglose por cuenta contable)
  const candidatos = construirCandidatos(gastos, fijosBearing);

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
                  <a href={`/admin/operaciones/${opDePurchase.get(g.id)!.id}`} className="block text-[10px] font-semibold text-[#2E1A47] hover:underline truncate" title={opDePurchase.get(g.id)!.nombre}>→ {opDePurchase.get(g.id)!.nombre}</a>
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
          <Link href="/admin/finanzas/gastos/fijos" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#2E1A47] hover:underline">Control anual de gastos fijos →</Link>
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
              <p className="text-2xl font-black text-white">{fmtEur(baseMes + baseObliviate + nominasMes.coste)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">+ IVA {fmtEur(ivaMes + (totalObliviate - baseObliviate))}{cargoTarjeta > 0 ? ` · tarjetas ${fmtEur(cargoTarjeta)}` : ""}{nominasMes.coste > 0.5 ? ` · nóminas ${fmtEur(nominasMes.coste)}` : ""} · caja {fmtEur(totalContados + cargoTarjeta + totalObliviate + nominasMes.coste)}</p>
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

          {/* Obliviate: solo informativo — su banco ya cuenta en la caja del grupo, no en estas sumas */}
          {gastosObliviateBanco > 0.5 && (
            <div className="mb-6 bg-amber-50/60 border border-amber-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-800">
                <span className="font-bold">Gastos de Obliviate por banco este mes: {fmtEur(gastosObliviateBanco)}</span>
                <span className="text-amber-700/70"> · en bruto (con IVA) · no suma en los totales de arriba, ya cuenta en la caja del grupo</span>
              </p>
              <Link href="/admin/finanzas/obliviate" className="text-xs font-semibold text-[#2E1A47] hover:underline whitespace-nowrap">Ver detalle →</Link>
            </div>
          )}

          {/* Gastos fijos del mes — Bearing (izq) · Obliviate (der), compacto */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Gastos fijos de {mesLabel(mes)}</h2>
              <AddGastoFijoButton candidatos={candidatos} categorias={categoriasGasto} />
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
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Obliviate</p>
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
            <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Gastos variables de {mesLabel(mes)} · {fmtEur(totalVariables - cargoTarjeta)}</h2>
            {variables.length === 0 ? (
              <div className="bg-white border border-gray-100 shadow-sm py-14 text-center"><p className="text-sm text-gray-400">Sin gastos variables este mes.</p></div>
            ) : (
              <div className="space-y-6">
                {BUCKETS.map(b => {
                  const items = variables.filter(g => bucketConLink(g) === b.key);
                  if (items.length === 0) return null;
                  const sub = items.reduce((s, g) => s + g.total, 0);
                  return (
                    <div key={b.key}>
                      <div className="flex items-end justify-between mb-2 gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="mt-1.5 w-2 h-2 rounded-sm bg-[#FFC845] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#2E1A47]">{b.label}</p>
                            <p className="text-[11px] text-gray-400 truncate">{b.desc}{b.nota ? ` · ${b.nota}` : ""}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(sub)} <span className="text-[10px] text-gray-400 font-normal">· {items.length}</span></p>
                      </div>

                      {b.key === "tarjeta" ? (
                        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl px-4 py-3">
                          <p className="text-xs text-amber-700"><b>{items.length} facturas</b> por {fmtEur(sub)} — no suman aquí: las cubre el recibo mensual de la tarjeta (detalle abajo).</p>
                        </div>
                      ) : (
                        <>
                          {b.key === "nomina" && (
                            <div className="bg-[#EEEBF3]/60 border border-[#2E1A47]/10 rounded-t-2xl px-4 py-2 text-[11px] text-[#2E1A47]/70">
                              Aquí solo entra lo que Holded registra como compra. Los <b>sueldos de Rita y Macarena</b> están en la sección <b>Nóminas y personal</b> (abajo), leída del libro diario.
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

          {/* Nóminas y personal — del libro diario: asientos de nómina (devengo)
              y, si la gestoría aún no los ha pasado, lo pagado por banco */}
          <div className="mt-6">
            <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Nóminas y personal · {mesLabel(mes)}</h2>
            <div className="space-y-4">
              {nominasMes.personas.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {nominasMes.personas.map((p, i) => (
                    <div key={i} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 bg-[#EEEBF3] flex items-center justify-between">
                        <p className="text-sm font-bold text-[#2E1A47]">{p.etiqueta}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${p.netoPagado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.netoPagado ? "Pagada" : "Pendiente de pago"}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        <div className="px-5 py-3 flex items-baseline justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-700">Líquido</p>
                            <p className="text-[11px] text-gray-400">lo que recibe la persona</p>
                          </div>
                          <p className="text-base font-black text-[#2E1A47] whitespace-nowrap">{fmtEur(p.neto)}</p>
                        </div>
                        <div className="px-5 py-3 flex items-baseline justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-700">{p.autonoma ? "Cuota de autónomos" : "Seguridad Social"}</p>
                            <p className="text-[11px] text-gray-400">{p.autonoma ? "la paga la empresa" : `empresa ${fmtEur(p.ssEmpresa)} · se paga a mes vencido`}</p>
                          </div>
                          <p className="text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(p.autonoma ? nominasMes.cuotaAutonomos : p.ssTotal)}</p>
                        </div>
                        <div className="px-5 py-3 flex items-baseline justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-700">IRPF retenido</p>
                            <p className="text-[11px] text-gray-400">a guardar para el modelo 111 trimestral</p>
                          </div>
                          <p className="text-sm font-bold text-amber-600 whitespace-nowrap">{fmtEur(p.irpf)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4">
                  <p className="text-xs text-gray-400">La gestoría aún no ha pasado los asientos de nómina de este mes — se cuenta lo pagado por banco{nominasMes.cuotaAutonomos > 0.5 ? ` y la cuota de autónomos (${fmtEur(nominasMes.cuotaAutonomos)})` : ""}.</p>
                </div>
              )}

              {/* Reserva del IRPF trimestral + pagos reales del mes (cuándo se paga) */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-[#2E1A47]">A guardar para Hacienda · IRPF del {trimestreN}º trimestre</p>
                    <p className="text-[11px] text-gray-400">retenido acumulado del trimestre (nóminas y facturas) — se ingresa con el modelo 111</p>
                  </div>
                  <p className="text-xl font-black text-amber-600 whitespace-nowrap">{fmtEur(irpfTrimestre)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                  <span className="uppercase tracking-wide text-[10px] font-bold text-gray-400">Pagado este mes:</span>
                  {nominasMes.pagosNetos > 0.5 && <span>Nóminas netas <b className="text-[#2E1A47]">{fmtEur(nominasMes.pagosNetos)}</b></span>}
                  {nominasMes.pagoSS > 0.5 && <span>Seguridad Social (TGSS) <b className="text-[#2E1A47]">{fmtEur(nominasMes.pagoSS)}</b></span>}
                  {nominasMes.pagoIRPF > 0.5 && <span>IRPF a Hacienda (mod. 111) <b className="text-[#2E1A47]">{fmtEur(nominasMes.pagoIRPF)}</b></span>}
                  {nominasMes.pagosNetos <= 0.5 && nominasMes.pagoSS <= 0.5 && nominasMes.pagoIRPF <= 0.5 && <span className="text-gray-400">nada aún</span>}
                  <span className="ml-auto text-sm font-black text-[#2E1A47]">Coste del mes: {fmtEur(nominasMes.coste)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas de crédito — mismo mecanismo para las 3: recibo a mes vencido
              (caja, descontando facturas ya contadas) + gastado del mes por categorías */}
          {tarjetas.filter(t => t.actividad).map(tj => (
            <div className="mt-6" key={tj.def.cuenta}>
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider mb-3">Tarjeta {tj.def.label} · {mesLabel(mes)}</h2>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Recibo cobrado por el banco</p>
                    <CargoTarjetaEdit year={anyoN} month={mesN} cuenta={tj.def.cuenta} importe={tj.recibo || null} />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      A mes vencido: <b>cubre el gasto de {mesAnteriorNombre}</b> ·{" "}
                      {tj.manual != null
                        ? <>fijado a mano · el diario dice <b>{fmtEur(tj.cargoAuto)}</b></>
                        : tj.cargoAuto > 0.005
                          ? <>automático del <b>libro diario</b> (cta {tj.def.cuentas.join(" + ")})</>
                          : <>este mes el banco no ha cobrado recibo</>}
                    </p>
                    {tj.facturasContadas > 0.005 ? (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1.5">
                        Incluye <b>{fmtEur(tj.facturasContadas)}</b> de facturas ya contadas en fijos/variables → en caja suma <b>{fmtEur(tj.enCaja)}</b> (sin duplicar)
                      </p>
                    ) : tj.recibo > 0.005 && (
                      <p className="text-[10px] text-gray-400 mt-1">En caja suma {fmtEur(tj.enCaja)}</p>
                    )}
                    {tj.recibo <= 0.005 && tj.gastadoPrev > 0.005 && (
                      <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 mt-1.5">
                        En {mesAnteriorNombre} se gastaron <b>{fmtEur(tj.gastadoPrev)}</b> con esta tarjeta y este mes no aparece ningún recibo del banco en la contabilidad. Falta por conciliar/apuntar el cargo — revisa el extracto (o ponlo a mano aquí arriba).
                      </p>
                    )}
                  </div>
                  {!verDetalleTarjeta && (
                    <div className="sm:text-right self-center">
                      <p className="text-[10px] text-gray-400">En los meses pasados la tarjeta cuenta solo por el recibo del banco.<br />Desde julio 2026, tu conciliación semanal alimenta el desglose por categorías.</p>
                    </div>
                  )}
                </div>
                {verDetalleTarjeta && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {/* Minisección "Gastado en el mes": se alimenta de la conciliación semanal
                        y se cobrará en el recibo del mes siguiente (a mes vencido) */}
                    <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Gastado en {mesLabel(mes)} · {fmtEur(tj.mesData.gastado)}</p>
                      <p className="text-[10px] text-gray-400">se cobrará en el recibo de {mesSiguienteNombre} · no suma en caja este mes</p>
                    </div>
                    {tj.mesData.tickets.length === 0 ? (
                      <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">Aún no hay movimientos conciliados de {mesLabel(mes)} — se irá llenando con tu conciliación semanal.</p>
                    ) : (<>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {CATEGORIAS_TICKET.map(c => {
                        const v = tj.mesData.porCategoria[c.key];
                        if (v <= 0.005) return null;
                        return (
                          <span key={c.key} className="inline-flex items-center gap-1.5 bg-[#EEEBF3] text-[#2E1A47] rounded-xl px-3 py-1.5 text-xs font-semibold">
                            {c.label} · {fmtEur(v)}
                          </span>
                        );
                      })}
                      {tj.mesData.pagosFactura > 0.005 && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
                          Pagos de factura · {fmtEur(tj.mesData.pagosFactura)}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {tj.mesData.tickets.map((t, i) => {
                        const cat = CATEGORIAS_TICKET.find(c => c.key === t.categoria);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                              <span className="text-xs font-medium text-gray-700 truncate">{t.desc}</span>
                              {t.pagaFactura
                                ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">Factura</span>
                                : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap">{cat?.label}</span>}
                              {t.esFactura && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 whitespace-nowrap" title="Factura de Holded aún sin conciliar como movimiento de tarjeta">con factura</span>}
                            </span>
                            <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{fmtEur(t.importe)}</span>
                          </div>
                        );
                      })}
                    </div>
                    </>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
