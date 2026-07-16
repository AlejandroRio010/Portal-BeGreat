import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGastos, CATEGORIAS_GASTO, type CategoriaGasto, type HoldedGasto } from "@/lib/holded";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORIAS = CATEGORIAS_GASTO;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function mesLabel(ym: string) { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${y}`; }

const ESTADO_BADGE: Record<HoldedGasto["estado"], { c: string; l: string }> = {
  pagada: { c: "bg-emerald-50 border border-emerald-200 text-emerald-700", l: "Pagada ✓" },
  parcial: { c: "bg-amber-50 border border-amber-200 text-amber-700", l: "Pago parcial" },
  pendiente: { c: "bg-red-50 border border-red-200 text-red-600", l: "Pendiente" },
};

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string; cat?: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const sp = await searchParams;
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const cat = CATEGORIAS.includes(sp.cat as CategoriaGasto) ? (sp.cat as CategoriaGasto) : null;

  let gastos: HoldedGasto[] = [];
  let holdedError: string | null = null;
  try { gastos = await getGastos(); } catch (e: any) { holdedError = e?.message ?? "Error conectando con Holded"; }

  const delMes = gastos.filter(g => g.date.startsWith(mes));
  const gastado = delMes.reduce((s, g) => s + g.total, 0);
  const pagado = delMes.filter(g => g.estado === "pagada").reduce((s, g) => s + g.total, 0) + delMes.filter(g => g.estado === "parcial").reduce((s, g) => s + g.pagado, 0);
  const pendientes = delMes.filter(g => g.estado !== "pagada");
  const pendienteTotal = pendientes.reduce((s, g) => s + g.pendiente, 0);
  const retencion = delMes.reduce((s, g) => s + g.retencion, 0);

  const porCategoria = CATEGORIAS.map(c => {
    const gs = delMes.filter(g => g.categoria === c);
    return { c, n: gs.length, total: gs.reduce((s, g) => s + g.total, 0) };
  }).filter(x => x.n > 0).sort((a, b) => b.total - a.total);

  const tabla = cat ? delMes.filter(g => g.categoria === cat) : delMes;
  const catQ = cat ? `&cat=${encodeURIComponent(cat)}` : "";
  const anyo = Number(mes.split("-")[0]);
  const cortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Gastos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas — Gastos</h1>
          <p className="text-sm text-gray-400 mt-1">Bearing Point S.L. · facturas de compra desde Holded · por cuenta contable</p>
          <Link href="/admin/finanzas/gastos/fijos" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#2E1A47] hover:underline">📌 Ver gastos fijos →</Link>
        </div>
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-2xl p-1 self-start">
          {cortos.map((m, i) => {
            const ym = `${anyo}-${String(i + 1).padStart(2, "0")}`;
            const activo = ym === mes; const futuro = ym > mesActual;
            if (futuro) return <span key={m} className="px-2 py-1.5 text-[11px] font-semibold text-gray-300 select-none">{m}</span>;
            return <Link key={m} href={`/admin/finanzas/gastos?mes=${ym}${catQ}`}
              className={`px-2 py-1.5 text-[11px] font-semibold rounded-xl transition-colors ${activo ? "bg-[#2E1A47] text-white" : "text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"}`}>{m}</Link>;
          })}
        </div>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastado en {mesLabel(mes).split(" ")[0]}</p>
              <p className="text-2xl font-black text-white">{fmtEur(gastado)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">{delMes.length} factura{delMes.length !== 1 ? "s" : ""} (IVA incl.)</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pagado</p>
              <p className="text-2xl font-black text-white">{fmtEur(pagado)}</p>
            </div>
            <div className="bg-white border border-gray-200 px-6 py-5">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pendiente de pago</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(pendienteTotal)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">{pendientes.length} sin pagar</p>
            </div>
            <div className="bg-white border border-amber-200 px-6 py-5">
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1.5">Retención IRPF</p>
              <p className="text-2xl font-black text-amber-600">{fmtEur(retencion)}</p>
              <p className="text-gray-400 text-[9px] mt-1 uppercase tracking-wide">retenido a colaboradores</p>
            </div>
          </div>

          {porCategoria.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <Link href={`/admin/finanzas/gastos?mes=${mes}`}
                className={`px-4 py-3 border rounded-2xl transition-all ${!cat ? "bg-[#2E1A47] border-[#2E1A47] text-white" : "bg-white border-gray-200 hover:border-[#2E1A47]/40"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${!cat ? "text-white/60" : "text-gray-400"}`}>Todo · {delMes.length}</p>
                <p className={`text-lg font-black ${!cat ? "text-white" : "text-[#2E1A47]"}`}>{fmtEur(gastado)}</p>
              </Link>
              {porCategoria.map(({ c, n, total }) => (
                <Link key={c} href={`/admin/finanzas/gastos?mes=${mes}${cat === c ? "" : `&cat=${encodeURIComponent(c)}`}`}
                  className={`px-4 py-3 border rounded-2xl transition-all ${cat === c ? "bg-[#2E1A47] border-[#2E1A47] text-white" : "bg-white border-gray-200 hover:border-[#2E1A47]/40"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${cat === c ? "text-white/60" : "text-gray-400"}`}>{c} · {n}</p>
                  <p className={`text-lg font-black ${cat === c ? "text-white" : "text-[#2E1A47]"}`}>{fmtEur(total)}</p>
                </Link>
              ))}
            </div>
          )}

          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{cat ? `${cat} — ` : ""}{tabla.length} factura{tabla.length !== 1 ? "s" : ""} en {mesLabel(mes)}</p>
              {cat && <Link href={`/admin/finanzas/gastos?mes=${mes}`} className="text-xs text-gray-400 hover:text-gray-600">✕ Quitar filtro</Link>}
            </div>
            {tabla.length === 0 ? (
              <div className="py-14 text-center"><p className="text-sm text-gray-400">Sin gastos este mes.</p></div>
            ) : (
              <div className="overflow-x-auto" style={{ zoom: 0.85 }}>
                <table className="w-full">
                  <thead><tr className="bg-[#EEEBF3] border-b border-gray-100">
                    {["Fecha", "Proveedor", "Concepto", "Categoría", "IVA", "Retención", "Total", "F. pago", "Estado"].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabla.map(g => { const b = ESTADO_BADGE[g.estado]; return (
                      <tr key={g.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                        <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(g.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-800 max-w-[160px] truncate" title={g.proveedor}>{g.proveedor}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[180px] truncate" title={g.description ?? undefined}>{g.description ?? "—"}</td>
                        <td className="px-3 py-3"><span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#EEEBF3] text-[#2E1A47] whitespace-nowrap">{g.categoria}</span></td>
                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtEur(g.tax)}</td>
                        <td className="px-3 py-3 text-xs text-amber-600 whitespace-nowrap">{g.retencion > 0 ? `−${fmtEur(g.retencion)}` : "—"}</td>
                        <td className="px-3 py-3 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(g.total)}</td>
                        <td className="px-3 py-3 text-xs text-emerald-700 font-semibold whitespace-nowrap">{g.fecha_pago ? new Date(g.fecha_pago).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}</td>
                        <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.c}`}>{b.l}</span></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
