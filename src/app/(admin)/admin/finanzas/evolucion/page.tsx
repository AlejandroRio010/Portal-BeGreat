import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getResumenCaja } from "@/lib/cajaResumen";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function EvolucionPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const anyoN = hoy.getFullYear();
  const mesActualIdx = hoy.getMonth();

  const { holdedError, saldoInicial, meses, cajaFinMes } = await getResumenCaja(anyoN);

  const ytd = meses.slice(0, mesActualIdx + 1);
  const ytdIngresos = ytd.reduce((s, x) => s + x.ingresos, 0);
  const ytdSalidas = ytd.reduce((s, x) => s + x.salidas, 0);
  const ytdNeto = ytdIngresos - ytdSalidas;
  const ytdPendiente = ytd.reduce((s, x) => s + x.pendiente, 0);
  const cajaHoy = saldoInicial != null ? saldoInicial + cajaFinMes[mesActualIdx] : cajaFinMes[mesActualIdx];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Evolución</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas — Evolución del año {anyoN}</h1>
        <p className="text-sm text-gray-400 mt-1">Mes a mes del grupo · importes sin IVA · <Link href="/admin/finanzas/caja" className="text-[#2E1A47] font-semibold hover:underline">ir a la caja del mes →</Link></p>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* Resumen del año */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Ingresos del año</p>
              <p className="text-2xl font-black text-white">{fmtEur(ytdIngresos)}</p>
              {ytdPendiente > 0.5 && <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">pendiente de cobrar {fmtEur(ytdPendiente)}</p>}
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gastos del año</p>
              <p className="text-2xl font-black text-white">{fmtEur(ytdSalidas)}</p>
            </div>
            <div className={`px-6 py-5 border ${ytdNeto >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${ytdNeto >= 0 ? "text-emerald-600" : "text-red-600"}`}>Neto del año</p>
              <p className={`text-2xl font-black ${ytdNeto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtEur(ytdNeto)}</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">{saldoInicial != null ? "Caja de bancos hoy" : "Variación de bancos"}</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(cajaHoy)}</p>
              {saldoInicial != null && <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">empezó el año en {fmtEur(saldoInicial)}</p>}
            </div>
          </div>

          {/* Tabla mes a mes */}
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
                    <tr key={x.ym} className="hover:bg-[#EEEBF3]/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/finanzas/caja?mes=${x.ym}`} className="text-sm font-semibold text-gray-700 hover:text-[#2E1A47] hover:underline">{CORTOS[x.m]}</Link>
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
                    <td className="px-4 py-3.5 text-sm text-right font-black text-[#FFC845] whitespace-nowrap">{fmtEur(cajaHoy)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Importes sin IVA (el IVA se lleva aparte para impuestos). Las tarjetas cuentan por el recibo del banco, descontando las facturas ya contadas en fijos o variables. Las nóminas salen del libro diario. {saldoInicial == null ? "Pon el saldo inicial de los bancos en la página de Caja para ver la caja absoluta en vez de la variación." : "La caja de bancos sale del libro diario (cuentas 57x) más el saldo inicial."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
