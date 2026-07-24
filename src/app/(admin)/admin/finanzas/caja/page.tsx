import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getResumenCaja } from "@/lib/cajaResumen";
import { CATEGORIAS_TICKET } from "@/lib/tarjetas";
import { BUCKETS } from "@/lib/gastosBuckets";
import { fmtEur } from "@/lib/format";
import SaldoInicialEdit from "./SaldoInicialEdit";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const mesLabel = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${y}`; };

const FASES_FIRMADA = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

type RepartoColaborador = { id?: string; nombre?: string; importe?: string };

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const sp = await searchParams;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [anyoN, mesN] = mes.split("-").map(Number);

  const [{ holdedError, saldoInicial, meses, cajaFinMes, saldoInicialObliviate, cajaObliviateFinMes, tarjetasCalc, gastos, facturas }, opsFirmadasAll] = await Promise.all([
    getResumenCaja(anyoN),
    db.select({
      id: operations.id,
      nombre: operations.nombre,
      producto: operations.producto,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      fecha_cierre: operations.fecha_cierre,
      created_at: operations.created_at,
      comision_begreat: operations.comision_begreat,
      comision_colaborador: operations.comision_colaborador,
      colaboradores_comision: operations.colaboradores_comision,
      holded_purchases: operations.holded_purchases,
      holded_invoices: operations.holded_invoices,
      cliente: clients.nombre,
      colaborador: collaborators.nombre,
    }).from(operations)
      .leftJoin(clients, eq(operations.client_id, clients.id))
      .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
      .where(inArray(operations.fase, FASES_FIRMADA)),
  ]);

  // Ops firmadas del mes seleccionado, por fecha de CIERRE (la fecha real de
  // firma; Alejandro mantiene el dato en las fichas). Si no la tiene, cae a la
  // fecha de alta.
  const comisionColabs = (o: { comision_colaborador: string | null; colaboradores_comision: unknown }) => {
    const rep = (o.colaboradores_comision as RepartoColaborador[] | null) ?? [];
    if (rep.length) return rep.reduce((s, c) => s + (parseFloat(c.importe ?? "") || 0), 0);
    return Number(o.comision_colaborador ?? 0);
  };
  const opsMes = opsFirmadasAll
    .filter(o => {
      const f = o.fecha_cierre ?? o.created_at;
      if (!f) return false;
      const d = new Date(f);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === mes;
    })
    .map(o => {
      // Lo que el colaborador ha FACTURADO de verdad (base sin IVA de sus
      // facturas de comisión vinculadas) — para avisar si no cuadra con lo pactado.
      const purchases = (o.holded_purchases as { id?: string; tipo?: string }[] | null) ?? [];
      const idsComision = purchases.filter(p => p.tipo === "comision" && p.id).map(p => p.id!);
      const facturado = gastos.filter(g => idsComision.includes(g.id)).reduce((s, g) => s + g.subtotal, 0);
      return { ...o, ganado: Number(o.comision_begreat ?? 0), pagado: comisionColabs(o), facturado, tieneFacturaComision: idsComision.length > 0 };
    })
    .sort((a, b) => b.ganado - a.ganado);
  const totalGanado = opsMes.reduce((s, o) => s + o.ganado, 0);
  const totalPagado = opsMes.reduce((s, o) => s + o.pagado, 0);

  // Cruce de meses: cobros y pagos de comisión que caen ESTE mes pero son de
  // ops de OTRO mes (la op se firma el 30 y la comisión se paga al siguiente).
  const mesDeOp = (o: { fecha_cierre: Date | null; created_at: Date }) => {
    const d = new Date(o.fecha_cierre ?? o.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  type MovCruzado = { key: string; tipo: "cobro" | "comision"; opId: string; opNombre: string; opMes: string; detalle: string; importe: number };
  const movsCruzados: MovCruzado[] = [];
  for (const o of opsFirmadasAll) {
    const om = mesDeOp(o);
    if (om === mes) continue;
    const nombre = o.nombre || o.producto || "Operación";
    for (const inv of ((o.holded_invoices as { id?: string }[] | null) ?? [])) {
      const f = inv?.id ? facturas.find(x => x.id === inv.id) : undefined;
      if (f?.fecha_cobro?.startsWith(mes) && f.pagado > 0.5)
        movsCruzados.push({ key: `c|${f.id}`, tipo: "cobro", opId: o.id, opNombre: nombre, opMes: om, detalle: `factura ${f.document_number}`, importe: f.subtotal });
    }
    for (const p of ((o.holded_purchases as { id?: string; tipo?: string }[] | null) ?? [])) {
      if (p.tipo !== "comision" || !p.id) continue;
      const g = gastos.find(x => x.id === p.id);
      if (g?.fecha_pago?.startsWith(mes))
        movsCruzados.push({ key: `p|${g.id}`, tipo: "comision", opId: o.id, opNombre: nombre, opMes: om, detalle: `${g.proveedor} · ${g.document_number}`, importe: g.subtotal });
    }
  }
  movsCruzados.sort((a, b) => b.importe - a.importe);

  const M = meses[mesN - 1];
  // Caja del GRUPO: bancos Bearing (Holded) + banco Obliviate (extracto importado)
  const cajaBearing = (m: number) => (saldoInicial != null ? saldoInicial + cajaFinMes[m] : cajaFinMes[m]);
  const cajaObliv = (m: number) => (saldoInicialObliviate != null ? saldoInicialObliviate + cajaObliviateFinMes[m] : cajaObliviateFinMes[m]);
  const cajaMes = cajaBearing(mesN - 1) + cajaObliv(mesN - 1);
  const cajaMesAnterior = mesN >= 2
    ? cajaBearing(mesN - 2) + cajaObliv(mesN - 2)
    : (saldoInicial != null || saldoInicialObliviate != null ? (saldoInicial ?? 0) + (saldoInicialObliviate ?? 0) : null);

  // Mini desglose del cargo de tarjeta: a qué se fue el gasto del MES ANTERIOR
  const desgloseTarjetas = tarjetasCalc
    .map(t => ({ def: t.def, cargo: t.enCaja[mesN - 1], prev: mesN >= 2 ? t.resumen[mesN - 2] : null }))
    .filter(t => t.cargo > 0.005);

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Resumen mensual</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Resumen mensual</h1>
          <p className="text-sm text-gray-400 mt-1">El mes en curso · importes sin IVA (la tarjeta, por su recibo bancario) · <Link href="/admin/finanzas/evolucion" className="text-[#2E1A47] font-semibold hover:underline">ver evolución del año →</Link></p>
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ingresos de {mesLabel(mes).split(" ")[0]}</p>
              <p className="text-2xl font-black text-white">{fmtEur(M.ingresos)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">cobrado {fmtEur(M.cobrado)}{M.pendiente > 0.5 ? ` · pendiente ${fmtEur(M.pendiente)}` : ""}</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastos</p>
              <p className="text-2xl font-black text-white">{fmtEur(M.salidas)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">fijos {fmtEur(M.fijosTotal)} · variables {fmtEur(M.variables)}{M.nominas > 0.5 ? ` · nóminas ${fmtEur(M.nominas)}` : ""}{M.tarjetas > 0.5 ? ` · tarjetas ${fmtEur(M.tarjetas)}` : ""}{M.impuestos > 0.5 ? ` · impuestos ${fmtEur(M.impuestos)}` : ""}</p>
            </div>
            <div className={`px-6 py-5 border ${M.neto >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${M.neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>Neto del mes</p>
              <p className={`text-2xl font-black ${M.neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(M.neto)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">ingresos − gastos del mes</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">{saldoInicial != null ? "Caja del grupo · fin de mes" : "Variación de bancos en el año"}</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(cajaMes)}</p>
              <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">
                Bearing {fmtEur(cajaBearing(mesN - 1))} · Obliviate {fmtEur(cajaObliv(mesN - 1))}{cajaMesAnterior != null ? ` · cerró ${mesN >= 2 ? MESES[mesN - 2] : "el año"} en ${fmtEur(cajaMesAnterior)}` : ""}
              </p>
              <div className="mt-1"><SaldoInicialEdit anyo={anyoN} valor={saldoInicial} /></div>
            </div>
          </div>

          {/* Ingresos y gastos, compactos, con acceso al detalle */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#EEEBF3] flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Ingresos por línea</h2>
                <Link href={`/admin/finanzas/ingresos?mes=${mes}`} className="text-[11px] font-semibold text-[#2E1A47] hover:underline">Ver facturas →</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {[...M.porLinea.entries()].sort((a, b) => b[1] - a[1]).map(([linea, importe]) => (
                  <div key={linea} className="px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-700">{linea}</p>
                    <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(importe)}</p>
                  </div>
                ))}
                {M.obliviateCobros > 0.5 && (
                  <div className="px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-700">Cobros Obliviate <Link href="/admin/finanzas/obliviate" className="text-[10px] text-[#2E1A47] hover:underline font-semibold">detalle →</Link></p>
                    <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.obliviateCobros)}</p>
                  </div>
                )}
                {M.porLinea.size === 0 && M.obliviateCobros <= 0.5 && <p className="px-4 py-6 text-center text-xs text-gray-400">Sin facturas este mes.</p>}
              </div>
              {M.pendiente > 0.5 && (
                <div className="px-4 py-2 bg-red-50/60 border-t border-red-100 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-red-700">Pendiente de cobrar</p>
                  <p className="text-xs font-black text-red-600">{fmtEur(M.pendiente)}</p>
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#EEEBF3] flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Gastos del mes</h2>
                <Link href={`/admin/finanzas/gastos?mes=${mes}`} className="text-[11px] font-semibold text-[#2E1A47] hover:underline">Ver detalle →</Link>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-4 py-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-700">Gastos fijos del grupo <Link href="/admin/finanzas/gastos/fijos" className="text-[10px] text-[#2E1A47] hover:underline font-semibold">control anual →</Link></p>
                  <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.fijosTotal)}</p>
                </div>
                {M.nominas > 0.5 && (
                  <div className="px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-700">Nóminas y personal</p>
                    <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.nominas)}</p>
                  </div>
                )}
                {M.impuestos > 0.5 && (
                  <div className="px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-700">Impuestos pagados (IVA / Sociedades) <Link href="/admin/finanzas/impuestos" className="text-[10px] text-[#2E1A47] hover:underline font-semibold">detalle →</Link></p>
                    <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.impuestos)}</p>
                  </div>
                )}
                {M.obliviateGastos > 0.5 && (
                  <div className="px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-700">Gastos Obliviate por banco <Link href="/admin/finanzas/obliviate" className="text-[10px] text-[#2E1A47] hover:underline font-semibold">detalle →</Link></p>
                    <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(M.obliviateGastos)}</p>
                  </div>
                )}
                {BUCKETS.filter(b => b.key !== "tarjeta").map(b => {
                  const v = M.porBucket.get(b.key) ?? 0;
                  if (v <= 0.5) return null;
                  return (
                    <div key={b.key} className="px-4 py-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-700">{b.label}</p>
                      <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(v)}</p>
                    </div>
                  );
                })}
                {desgloseTarjetas.map(t => (
                  <div key={t.def.cuenta} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-700">Tarjeta {t.def.banco} <span className="text-[10px] text-gray-400">· recibo de {MESES[(mesN + 10) % 12]}</span></p>
                      <p className="text-xs font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(t.cargo)}</p>
                    </div>
                    {t.prev && t.prev.gastado > 0.5 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
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

          {/* Operaciones firmadas del mes: lo ganado y lo pagado a colaboradores */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones firmadas en {mesLabel(mes)}</h2>
              {opsMes.length > 0 && (
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-[#2E1A47]">BeGreat {fmtEur(totalGanado)}</span>
                  {totalPagado > 0.5 && <> · colaboradores <span className="font-bold text-gray-700">{fmtEur(totalPagado)}</span></>}
                </p>
              )}
            </div>
            {opsMes.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-5 py-8 text-center text-sm text-gray-400">Sin operaciones firmadas este mes.</div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {opsMes.map(o => (
                  <Link key={o.id} href={`/admin/operaciones/${o.id}`}
                    className="group bg-white border border-gray-100 shadow-sm rounded-2xl p-4 hover:border-[#2E1A47]/40 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-[#2E1A47] leading-tight">{o.nombre || o.producto || "Operación"}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${o.pipeline_key === "renting" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-[#FFC845]/20 text-[#8a6d00]"}`}>{o.pipeline_key === "renting" ? "Renting" : "Consultoría"}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3 truncate">{[o.cliente, o.colaborador].filter(Boolean).join(" · ") || o.fase}</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Comisión BeGreat</p>
                        <p className="text-lg font-black text-emerald-700">{fmtEur(o.ganado)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">A colaboradores</p>
                        <p className={`text-sm font-bold ${o.pagado > 0.5 ? "text-gray-700" : "text-gray-300"}`}>{o.pagado > 0.5 ? fmtEur(o.pagado) : "—"}</p>
                      </div>
                    </div>
                    {o.pagado > 0.5 && o.tieneFacturaComision && Math.abs(o.facturado - o.pagado) > 0.5 && (
                      <p className="text-[10px] font-semibold text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">⚠ Facturado {fmtEur(o.facturado)} de {fmtEur(o.pagado)} pactados</p>
                    )}
                    {o.pagado > 0.5 && !o.tieneFacturaComision && (
                      <p className="text-[10px] text-gray-400 mt-2">Sin factura de comisión vinculada aún</p>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Cobros y comisiones de ops de OTROS meses que caen en este */}
            {movsCruzados.length > 0 && (
              <div className="mt-4 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#EEEBF3]">
                  <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Movidas este mes de operaciones de otros meses</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {movsCruzados.map(m => (
                    <Link key={m.key} href={`/admin/operaciones/${m.opId}`} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#EEEBF3]/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm ${m.tipo === "cobro" ? "text-emerald-600" : "text-gray-400"}`}>{m.tipo === "cobro" ? "↓" : "↑"}</span>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">
                            {m.tipo === "cobro" ? "Cobrada" : "Pagada la comisión de"} <span className="font-semibold">{m.opNombre}</span>
                            <span className="text-gray-400"> · op de {mesLabel(m.opMes)}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{m.detalle}</p>
                        </div>
                      </div>
                      <p className={`text-xs font-bold whitespace-nowrap ${m.tipo === "cobro" ? "text-emerald-700" : "text-gray-700"}`}>{m.tipo === "cobro" ? "+" : "−"} {fmtEur(m.importe)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <p className="text-[11px] text-gray-400">
            Importes sin IVA (el IVA se lleva aparte para impuestos). Las tarjetas cuentan por el recibo del banco, descontando las facturas ya contadas en fijos o variables. Las nóminas salen del libro diario. {saldoInicial == null ? "Pon el saldo inicial de los bancos a 1 de enero para ver la caja absoluta en vez de la variación." : "La caja de bancos sale del libro diario (cuentas 57x) más el saldo inicial."} La evolución mes a mes del año está en <Link href="/admin/finanzas/evolucion" className="text-[#2E1A47] font-semibold hover:underline">su propia sección →</Link>
          </p>
        </>
      )}
    </div>
  );
}
