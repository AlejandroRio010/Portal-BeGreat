import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGastos, type HoldedGasto } from "@/lib/holded";
import { GASTOS_FIJOS, esDelFijo } from "@/lib/gastosFijos";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function GastosFijosPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const mesActualIdx = hoy.getMonth(); // 0-11

  let gastos: HoldedGasto[] = [];
  let holdedError: string | null = null;
  try { gastos = await getGastos(); } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  const delAnyo = gastos.filter(g => g.date.startsWith(String(anyo)));

  // Para cada gasto fijo, el estado de cada mes
  const filas = GASTOS_FIJOS.map(gf => {
    const meses = CORTOS.map((_, m) => {
      const ym = `${anyo}-${String(m + 1).padStart(2, "0")}`;
      const facts = delAnyo.filter(g => g.date.startsWith(ym) && esDelFijo(gf, g.proveedor, g.total));
      const total = facts.reduce((s, g) => s + g.total, 0);
      const hayFactura = facts.length > 0;
      const pagadas = hayFactura && facts.every(g => g.estado === "pagada");
      let estado: "pagado" | "sin_pagar" | "falta" | "futuro";
      if (pagadas) estado = "pagado";
      else if (hayFactura) estado = "sin_pagar";
      else if (m < mesActualIdx) estado = "falta";       // mes pasado sin factura → rojo
      else estado = "futuro";                             // mes actual o futuro → neutro
      return { m, estado, total, hayFactura };
    });
    const anualPrevisto = gf.mensual != null ? gf.mensual * 12 : meses.reduce((s, x) => s + x.total, 0);
    const pagadoAnyo = meses.filter(x => x.estado === "pagado").reduce((s, x) => s + x.total, 0);
    return { gf, meses, anualPrevisto, pagadoAnyo };
  });

  const totalMensual = GASTOS_FIJOS.reduce((s, g) => s + (g.mensual ?? 0), 0);

  const COLOR: Record<string, string> = {
    pagado: "bg-emerald-500 text-white",
    sin_pagar: "bg-amber-400 text-white",
    falta: "bg-red-500 text-white",
    futuro: "bg-gray-100 text-gray-300",
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span>
          <Link href="/admin/finanzas/gastos" className="hover:text-[#2E1A47]">Gastos</Link><span>/</span>
          <span className="text-gray-600 font-medium">Fijos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Gastos fijos {anyo}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Recurrentes de Bearing Point · verde = factura recibida y pagada · rojo = mes pasado sin pagar · gris = aún no toca
        </p>
      </div>

      {holdedError ? (
        <div className="bg-red-50 border border-red-200 p-6"><p className="text-sm font-bold text-red-700">No se pudo conectar con Holded</p><p className="text-xs text-red-500 mt-1">{holdedError}</p></div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Fijos activos</p>
              <p className="text-3xl font-black text-white">{GASTOS_FIJOS.length}</p>
            </div>
            <div className="bg-[#2E1A47] px-6 py-5">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Coste fijo mensual</p>
              <p className="text-2xl font-black text-white">{fmtEur(totalMensual)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">sin contar los variables</p>
            </div>
            <div className="bg-[#EEEBF3] px-6 py-5">
              <p className="text-[#2E1A47]/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Anualizado (fijos)</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totalMensual * 12)}</p>
            </div>
          </div>

          {/* Tabla de fijos con rejilla de meses */}
          <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EEEBF3] border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Gasto fijo</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">€/mes</th>
                    {CORTOS.map((m, i) => (
                      <th key={m} className={`text-center px-1.5 py-3 text-[10px] font-bold uppercase ${i === mesActualIdx ? "text-[#2E1A47]" : "text-gray-400"}`}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filas.map(({ gf, meses }) => (
                    <tr key={gf.label} className="hover:bg-[#EEEBF3]/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{gf.label}</p>
                        <p className="text-[10px] text-gray-400">{gf.categoria}{gf.nota ? ` · ${gf.nota}` : ""}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-[#2E1A47] whitespace-nowrap">{gf.mensual != null ? fmtEur(gf.mensual) : "variable"}</td>
                      {meses.map(({ m, estado, total, hayFactura }) => (
                        <td key={m} className="px-1 py-2 text-center">
                          <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold ${COLOR[estado]}`}
                            title={hayFactura ? `${fmtEur(total)} · ${estado === "pagado" ? "pagada" : "sin pagar"}` : estado === "falta" ? "sin factura (mes pasado)" : "aún no"}>
                            {estado === "pagado" ? "✓" : estado === "sin_pagar" ? "€" : estado === "falta" ? "✕" : ""}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Recibida y pagada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Recibida sin pagar</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Mes pasado sin factura/pago</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Aún no toca</span>
          </div>
        </>
      )}
    </div>
  );
}
