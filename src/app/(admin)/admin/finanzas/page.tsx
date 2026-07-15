import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFacturasVenta, type CategoriaIngreso, type HoldedInvoice } from "@/lib/holded";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORIAS: CategoriaIngreso[] = [
  "Consultoría financiera",
  "Renting — comisiones",
  "Renting — equipos (margen)",
  "CFO Externo",
  "Recurrentes USA",
  "Productos de inversión",
  "Grupo",
  "Otros",
];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function mesLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function mesShift(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  const delMes = facturas.filter(f => f.date.startsWith(mes));
  const facturado = delMes.reduce((s, f) => s + f.total, 0);
  const cobradas = delMes.filter(f => f.estado === "cobrada");
  const cobrado = cobradas.reduce((s, f) => s + f.total, 0) + delMes.filter(f => f.estado === "parcial").reduce((s, f) => s + f.pagado, 0);
  const ivaCobrado = cobradas.reduce((s, f) => s + f.tax, 0);

  // Pendiente de cobro: TODO lo emitido sin cobrar (no solo del mes)
  const pendientes = facturas.filter(f => f.estado !== "cobrada");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Ingresos</h1>
          <p className="text-sm text-gray-400 mt-1">Facturas de venta desde Holded · se marcan cobradas solas al conciliar el banco</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/finanzas?mes=${mesShift(mes, -1)}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}`}
            className="px-3 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:text-[#2E1A47]">←</Link>
          <span className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-bold capitalize">{mesLabel(mes)}</span>
          {mes < mesActual && (
            <Link href={`/admin/finanzas?mes=${mesShift(mes, 1)}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}`}
              className="px-3 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:text-[#2E1A47]">→</Link>
          )}
        </div>
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
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Facturado en {mesLabel(mes).split(" ")[0]}</p>
              <p className="text-2xl font-black text-white">{fmtEur(facturado)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">{delMes.length} factura{delMes.length !== 1 ? "s" : ""} (IVA incl.)</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Cobrado</p>
              <p className="text-2xl font-black text-white">{fmtEur(cobrado)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">de lo facturado este mes</p>
            </div>
            <div className="bg-white border border-gray-200 px-6 py-5">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pendiente de cobro (total)</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(pendienteTotal)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">{pendientes.length} factura{pendientes.length !== 1 ? "s" : ""} sin cobrar desde enero</p>
            </div>
            <div className="bg-white border border-amber-200 px-6 py-5">
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">⚠ De lo cobrado, es IVA</p>
              <p className="text-2xl font-black text-amber-600">{fmtEur(ivaCobrado)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">no es tuyo — resérvalo para Hacienda</p>
            </div>
          </div>

          {/* Aviso IVA trimestral */}
          <div className="bg-amber-50 border border-amber-200 px-5 py-3.5 mb-6 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              <span className="font-bold">IVA cobrado en el {q}º trimestre:</span> ve apartando este importe para la liquidación de Hacienda.
            </p>
            <p className="text-lg font-black text-amber-700 whitespace-nowrap ml-4">{fmtEur(ivaTrimestre)}</p>
          </div>

          {/* Categorías del mes (clic para filtrar la tabla) */}
          {porCategoria.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {porCategoria.map(({ c, n, total }) => (
                <Link key={c} href={`/admin/finanzas?mes=${mes}${cat === c ? "" : `&cat=${encodeURIComponent(c)}`}`}
                  className={`px-4 py-3 border transition-all ${cat === c ? "bg-[#2E1A47] border-[#2E1A47] text-white" : "bg-white border-gray-200 hover:border-[#2E1A47]/40"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${cat === c ? "text-white/60" : "text-gray-400"}`}>{c} · {n}</p>
                  <p className={`text-lg font-black ${cat === c ? "text-white" : "text-[#2E1A47]"}`}>{fmtEur(total)}</p>
                </Link>
              ))}
            </div>
          )}

          {cat === "Renting — equipos (margen)" && (
            <div className="bg-blue-50 border border-blue-200 px-5 py-3 mb-4">
              <p className="text-xs text-blue-700">
                <span className="font-bold">Ojo:</span> de estas facturas solo el <span className="font-bold">margen</span> es ingreso real de BeGreat — el resto se paga al proveedor de los equipos (o al cliente si los adelantó). Lo cruzaremos con los pagos en la fase de gastos.
              </p>
            </div>
          )}

          {/* Tabla de facturas */}
          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {cat ? `${cat} — ` : ""}{tabla.length} factura{tabla.length !== 1 ? "s" : ""} en {mesLabel(mes)}
              </p>
              {cat && <Link href={`/admin/finanzas?mes=${mes}`} className="text-xs text-gray-400 hover:text-gray-600">✕ Quitar filtro</Link>}
            </div>
            {tabla.length === 0 ? (
              <div className="py-14 text-center"><p className="text-sm text-gray-400">Sin facturas este mes.</p></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EEEBF3] border-b border-gray-100">
                    {["Fecha", "Nº", "Cliente", "Concepto", "Categoría", "Base", "IVA", "Total", "Estado"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tabla.map(f => {
                    const b = ESTADO_BADGE[f.estado];
                    return (
                      <tr key={f.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(f.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</td>
                        <td className="px-4 py-3 text-xs font-mono font-bold text-[#2E1A47] whitespace-nowrap">{f.document_number}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 max-w-[180px] truncate">{f.contact_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[260px] truncate">{f.description ?? "—"}</td>
                        <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap">{f.categoria}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtEur(f.subtotal)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtEur(f.tax)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(f.total)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.c}`}>{b.l}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pendientes de cobro (si no estamos ya filtrando) */}
          {!cat && pendientes.length > 0 && (
            <div className="mt-6 bg-white border border-red-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
                <p className="text-sm font-bold text-red-700">Pendientes de cobro ({pendientes.length}) — {fmtEur(pendienteTotal)}</p>
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
