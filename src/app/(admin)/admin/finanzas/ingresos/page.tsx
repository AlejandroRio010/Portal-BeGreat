import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { getFacturasVenta, CATEGORIAS_INGRESO, type CategoriaIngreso, type HoldedInvoice } from "@/lib/holded";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORIAS = CATEGORIAS_INGRESO;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function mesLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function trimestreDe(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const q = Math.ceil(m / 3);
  const meses = [];
  for (let i = (q - 1) * 3 + 1; i <= q * 3; i++) meses.push(`${y}-${String(i).padStart(2, "0")}`);
  return { q, meses };
}

const ESTADO_BADGE: Record<HoldedInvoice["estado"], { c: string; l: string }> = {
  cobrada: { c: "bg-emerald-50 border border-emerald-200 text-emerald-700", l: "Cobrada ✓" },
  parcial: { c: "bg-amber-50 border border-amber-200 text-amber-700", l: "Pago parcial" },
  pendiente: { c: "bg-red-50 border border-red-200 text-red-600", l: "Pendiente" },
};

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ mes?: string; cat?: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const sp = await searchParams;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const cat = CATEGORIAS.includes(sp.cat as CategoriaIngreso) ? (sp.cat as CategoriaIngreso) : null;

  let facturas: HoldedInvoice[] = [];
  let holdedError: string | null = null;
  try {
    facturas = await getFacturasVenta();
  } catch (e: any) {
    holdedError = e?.message ?? "Error conectando con Holded";
  }

  // Mapa factura de venta → operación que la tiene ligada (cobro)
  const ops = await db.select({ id: operations.id, nombre: operations.nombre, holded_invoices: operations.holded_invoices }).from(operations);
  const opDeFactura = new Map<string, { id: string; nombre: string }>();
  for (const o of ops) {
    for (const p of (o.holded_invoices as { id?: string }[] | null) ?? []) {
      if (p?.id) opDeFactura.set(p.id, { id: o.id, nombre: o.nombre ?? "Operación" });
    }
  }

  const delMes = facturas.filter(f => f.date.startsWith(mes));
  const facturado = delMes.reduce((s, f) => s + f.total, 0);
  const baseFacturado = delMes.reduce((s, f) => s + f.subtotal, 0);
  const ivaFacturado = delMes.reduce((s, f) => s + f.tax, 0);
  const cobradas = delMes.filter(f => f.estado === "cobrada");
  const cobrado = cobradas.reduce((s, f) => s + f.total, 0) + delMes.filter(f => f.estado === "parcial").reduce((s, f) => s + f.pagado, 0);
  const ivaCobrado = cobradas.reduce((s, f) => s + f.tax, 0);

  // Pendiente de cobro del mes visible
  const pendientes = delMes.filter(f => f.estado !== "cobrada");
  const pendienteTotal = pendientes.reduce((s, f) => s + f.pendiente, 0);

  // IVA del trimestre (facturas cobradas) → hay que reservarlo para Hacienda
  const { q, meses: mesesQ } = trimestreDe(mes);
  const ivaTrimestre = facturas
    .filter(f => mesesQ.some(m => f.date.startsWith(m)) && f.estado === "cobrada")
    .reduce((s, f) => s + f.tax, 0);

  const porCategoria = CATEGORIAS.map(c => {
    const fs = delMes.filter(f => f.categoria === c);
    return { c, n: fs.length, total: fs.reduce((s, f) => s + f.total, 0) };
  }).filter(x => x.n > 0);

  const tabla = (cat ? delMes.filter(f => f.categoria === cat) : delMes);

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Ingresos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Ingresos</h1>
          <p className="text-sm text-gray-400 mt-1">Bearing Point S.L. · facturas de venta desde Holded · clasificadas por cuenta contable</p>
        </div>
        {/* Selector de mes: un clic a cualquier mes del año */}
        {(() => {
          const [anyoStr] = mes.split("-");
          const anyo = Number(anyoStr);
          const anyoActual = Number(mesActual.split("-")[0]);
          const cortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          const catQ = cat ? `&cat=${encodeURIComponent(cat)}` : "";
          return (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                {anyo > 2026 && (
                  <Link href={`/admin/finanzas/ingresos?mes=${anyo - 1}-12${catQ}`} className="text-gray-400 hover:text-[#2E1A47] text-xs font-bold">‹</Link>
                )}
                <span className="text-sm font-bold text-[#2E1A47]">{anyo}</span>
                {anyo < anyoActual && (
                  <Link href={`/admin/finanzas/ingresos?mes=${anyo + 1}-01${catQ}`} className="text-gray-400 hover:text-[#2E1A47] text-xs font-bold">›</Link>
                )}
              </div>
              <div className="flex gap-0.5 bg-white border border-gray-200 rounded-2xl p-1">
                {cortos.map((m, i) => {
                  const ym = `${anyo}-${String(i + 1).padStart(2, "0")}`;
                  const activo = ym === mes;
                  const futuro = ym > mesActual;
                  if (futuro) return <span key={m} className="px-2 py-1.5 text-[11px] font-semibold text-gray-300 select-none">{m}</span>;
                  return (
                    <Link key={m} href={`/admin/finanzas/ingresos?mes=${ym}${catQ}`}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-xl transition-colors ${activo ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"}`}>
                      {m}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6">
          <p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p>
          <p className="text-xs text-red-500 mt-1">{holdedError}</p>
        </div>
      ) : (
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Facturado en {mesLabel(mes).split(" ")[0]} · sin IVA</p>
              <p className="text-2xl font-black text-white">{fmtEur(baseFacturado)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">+ IVA {fmtEur(ivaFacturado)} · total {fmtEur(facturado)}</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Cobrado</p>
              <p className="text-2xl font-black text-white">{fmtEur(cobrado)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">de lo facturado este mes</p>
            </div>
            <div className="bg-white border border-gray-200 px-6 py-5">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pendiente de cobro</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(pendienteTotal)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">{pendientes.length} factura{pendientes.length !== 1 ? "s" : ""} del mes sin cobrar</p>
            </div>
            <div className="bg-white border border-amber-200 px-6 py-5">
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">⚠ De lo cobrado, es IVA</p>
              <p className="text-2xl font-black text-amber-600">{fmtEur(ivaCobrado)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">no es tuyo — resérvalo para Hacienda</p>
            </div>
          </div>

          {/* Aviso IVA: mensual, y en el mes de cierre de trimestre, el total a liquidar */}
          {(() => {
            const mesNum = Number(mes.split("-")[1]);
            const esCierreTrimestre = mesNum % 3 === 0;
            return esCierreTrimestre ? (
              <div className="bg-amber-50 border-2 border-amber-300 px-5 py-3.5 mb-6 flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">Cierre del {q}º trimestre</span> — IVA cobrado en todo el trimestre, a reservar para la liquidación de Hacienda (modelo 303).
                </p>
                <p className="text-xl font-black text-amber-700 whitespace-nowrap ml-4">{fmtEur(ivaTrimestre)}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 px-5 py-3.5 mb-6 flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">IVA cobrado en {mesLabel(mes).split(" ")[0]}:</span> ve apartándolo — el total del {q}º trimestre se liquida al cierre.
                </p>
                <p className="text-lg font-black text-amber-700 whitespace-nowrap ml-4">{fmtEur(ivaCobrado)}</p>
              </div>
            );
          })()}

          {/* Categorías del mes (clic para filtrar; "Todo" vuelve al resumen) */}
          {porCategoria.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <Link href={`/admin/finanzas/ingresos?mes=${mes}`}
                className={`px-4 py-3 border rounded-2xl transition-all ${!cat ? "bg-[#2E1A47] border-[#2E1A47] text-white" : "bg-white border-gray-200 hover:border-[#2E1A47]/40"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${!cat ? "text-white/60" : "text-gray-400"}`}>Todo · {delMes.length}</p>
                <p className={`text-lg font-black ${!cat ? "text-white" : "text-[#2E1A47]"}`}>{fmtEur(facturado)}</p>
              </Link>
              {porCategoria.map(({ c, n, total }) => (
                <Link key={c} href={`/admin/finanzas/ingresos?mes=${mes}${cat === c ? "" : `&cat=${encodeURIComponent(c)}`}`}
                  className={`px-4 py-3 border rounded-2xl transition-all ${cat === c ? "bg-[#2E1A47] border-[#2E1A47] text-white" : "bg-white border-gray-200 hover:border-[#2E1A47]/40"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${cat === c ? "text-white/60" : "text-gray-400"}`}>{c} · {n}</p>
                  <p className={`text-lg font-black ${cat === c ? "text-white" : "text-[#2E1A47]"}`}>{fmtEur(total)}</p>
                </Link>
              ))}
            </div>
          )}

          {cat === "Renting de equipos" && (
            <div className="bg-blue-50 border border-blue-200 px-5 py-3 mb-4">
              <p className="text-xs text-blue-700">
                <span className="font-bold">Ojo:</span> de estas facturas solo el <span className="font-bold">margen</span> es ingreso real — el resto se paga al proveedor de los equipos (o al cliente si los adelantó). Lo cruzaremos con los pagos en la fase de gastos.
              </p>
            </div>
          )}

          {/* Tabla de facturas */}
          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {cat ? `${cat} — ` : ""}{tabla.length} factura{tabla.length !== 1 ? "s" : ""} en {mesLabel(mes)}
              </p>
              {cat && <Link href={`/admin/finanzas/ingresos?mes=${mes}`} className="text-xs text-gray-400 hover:text-gray-600">✕ Quitar filtro</Link>}
            </div>
            {tabla.length === 0 ? (
              <div className="py-14 text-center"><p className="text-sm text-gray-400">Sin facturas este mes.</p></div>
            ) : (
              <div className="overflow-x-auto" style={{ zoom: 0.85 }}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#EEEBF3] border-b border-gray-100">
                      {["Fecha", "Nº", "Cliente", "Concepto", "Categoría", "Base", "IVA", "Total", "F. cobro", "Estado"].map(h => (
                        <th key={h} className={`px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider ${["Base", "IVA", "Total"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabla.map(f => {
                      const b = ESTADO_BADGE[f.estado];
                      return (
                        <tr key={f.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(f.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</td>
                          <td className="px-3 py-3 text-xs font-mono font-bold text-[#2E1A47] whitespace-nowrap">{f.document_number}</td>
                          <td className="px-3 py-3 max-w-[170px]">
                            <span className="block text-sm font-semibold text-gray-800 truncate" title={f.contact_name}>{f.contact_name}</span>
                            {opDeFactura.get(f.id) && (
                              <a href={`/admin/operaciones/${opDeFactura.get(f.id)!.id}`} className="block text-[10px] font-semibold text-[#2E1A47] hover:underline truncate" title={opDeFactura.get(f.id)!.nombre}>🔗 {opDeFactura.get(f.id)!.nombre}</a>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={f.description ?? undefined}>{f.description ?? "—"}</td>
                          <td className="px-3 py-3"><span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap" title={f.cuenta_pgc ? `Cuenta ${f.cuenta_pgc}` : undefined}>{f.categoria}</span></td>
                          <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap">{fmtEur(f.subtotal)}</td>
                          <td className="px-3 py-3 text-xs text-gray-400 text-right whitespace-nowrap">{f.tax > 0 ? fmtEur(f.tax) : "—"}</td>
                          <td className="px-3 py-3 text-sm font-bold text-[#2E1A47] text-right whitespace-nowrap">{fmtEur(f.total)}</td>
                          <td className="px-3 py-3 text-xs text-emerald-700 font-semibold whitespace-nowrap">
                            {f.fecha_cobro ? new Date(f.fecha_cobro).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}
                          </td>
                          <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.c}`}>{b.l}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pendientes de cobro (si no estamos ya filtrando) */}
          {!cat && pendientes.length > 0 && (
            <div className="mt-6 bg-white border border-red-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
                <p className="text-sm font-bold text-red-700">Pendientes de cobro de {mesLabel(mes)} ({pendientes.length}) — {fmtEur(pendienteTotal)}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {pendientes.slice(0, 15).map(f => (
                  <div key={f.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.contact_name} <span className="text-xs font-mono text-gray-400 ml-1">{f.document_number}</span></p>
                      <p className="text-xs text-gray-400 truncate">{f.description ?? "—"} · {new Date(f.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <p className="text-sm font-black text-red-600 whitespace-nowrap">{fmtEur(f.pendiente)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
