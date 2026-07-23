import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLibroDiario } from "@/lib/holdedLedger";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

// Impuestos PAGADOS según el diario de Holded — nada de calcular liquidaciones:
// aquí solo se lista lo que de verdad ha salido del banco hacia Hacienda.
// Cuentas: 47500000 = IVA (mod. 303) · 47510000 = IRPF retenciones (mod. 111)
// · 47300000 = pagos fraccionados del IS (mod. 202).
const CUENTAS_IMPUESTO: Record<string, "iva" | "irpf" | "is"> = {
  "47500000": "iva",
  "47510000": "irpf",
  "47300000": "is",
};
const ETIQUETA = { iva: "IVA (mod. 303)", irpf: "IRPF (mod. 111)", is: "Sociedades (mod. 202)" } as const;

interface PagoImpuesto { fecha: string; tipo: "iva" | "irpf" | "is"; importe: number; periodo: string; orden: string }

// A qué liquidación corresponde un pago, por su fecha (se paga el mes siguiente
// al cierre del periodo: enero → 4T del año anterior; abril → 1T; julio → 2T;
// octubre → 3T). El 202 va por pagos: abril (1P), octubre (2P), diciembre (3P).
function periodoDe(fecha: string, tipo: "iva" | "irpf" | "is"): { periodo: string; orden: string } {
  const [y, m] = fecha.split("-").map(Number);
  if (tipo === "is") {
    const p = m <= 4 ? "1er pago (abril)" : m <= 10 ? "2º pago (octubre)" : "3er pago (diciembre)";
    return { periodo: `Modelo 202 · ${p} ${y}`, orden: `${y}-${String(m).padStart(2, "0")}` };
  }
  if (m <= 3) return { periodo: `4T ${y - 1}`, orden: `${y - 1}-13` };
  if (m <= 6) return { periodo: `1T ${y}`, orden: `${y}-03` };
  if (m <= 9) return { periodo: `2T ${y}`, orden: `${y}-06` };
  return { periodo: `3T ${y}`, orden: `${y}-09` };
}

export default async function ImpuestosPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  let holdedError: string | null = null;
  const pagos: PagoImpuesto[] = [];
  try {
    const diario = await getLibroDiario();
    // Un pago de impuestos = asiento que carga una cuenta de Hacienda (4750/4751/473)
    // con contrapartida en banco (57x al haber).
    const asientosConBanco = new Set(diario.filter(l => l.account.startsWith("57") && l.credit > 0.005).map(l => l.entry));
    for (const l of diario) {
      const tipo = CUENTAS_IMPUESTO[l.account];
      if (!tipo || l.debit <= 0.005 || !asientosConBanco.has(l.entry)) continue;
      const { periodo, orden } = periodoDe(l.date, tipo);
      pagos.push({ fecha: l.date, tipo, importe: l.debit, periodo, orden });
    }
  } catch (e: any) { holdedError = e?.message ?? "Error Holded"; }

  // Agrupar por liquidación (los trimestres de IVA/IRPF juntos; el 202 aparte)
  const grupos = new Map<string, { periodo: string; orden: string; iva: number; irpf: number; is: number; fechas: string[] }>();
  for (const p of pagos) {
    if (!grupos.has(p.periodo)) grupos.set(p.periodo, { periodo: p.periodo, orden: p.orden, iva: 0, irpf: 0, is: 0, fechas: [] });
    const g = grupos.get(p.periodo)!;
    g[p.tipo] += p.importe;
    if (!g.fechas.includes(p.fecha)) g.fechas.push(p.fecha);
  }
  const filas = [...grupos.values()].sort((a, b) => a.orden.localeCompare(b.orden));
  const totIva = pagos.filter(p => p.tipo === "iva").reduce((s, p) => s + p.importe, 0);
  const totIrpf = pagos.filter(p => p.tipo === "irpf").reduce((s, p) => s + p.importe, 0);
  const totIs = pagos.filter(p => p.tipo === "is").reduce((s, p) => s + p.importe, 0);
  const fmtFecha = (f: string) => { const [y, m, d] = f.split("-"); return `${d}/${m}/${y.slice(2)}`; };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Impuestos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas — Impuestos</h1>
        <p className="text-sm text-gray-400 mt-1">Lo pagado de verdad a Hacienda según Holded · nada de estimaciones</p>
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
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">Sociedades a cuenta</p>
              <p className="text-2xl font-black text-white">{fmtEur(totIs)}</p>
              <p className="text-white/40 text-[9px] mt-1 uppercase tracking-wide">modelo 202 · pagos fraccionados</p>
            </div>
            <div className="bg-[#FFC845]/15 border border-[#FFC845] px-6 py-5">
              <p className="text-[#2E1A47]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">Total a Hacienda</p>
              <p className="text-2xl font-black text-[#2E1A47]">{fmtEur(totIva + totIrpf + totIs)}</p>
              <p className="text-[#2E1A47]/50 text-[9px] mt-1 uppercase tracking-wide">pagado por banco este año</p>
            </div>
          </div>

          {/* Liquidaciones */}
          <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#2E1A47]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pagos por liquidación</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EEEBF3] border-b border-gray-100">
                    {["Liquidación", "Pagado el", ETIQUETA.iva, ETIQUETA.irpf, ETIQUETA.is, "Total"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider ${i <= 1 ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filas.map(f => (
                    <tr key={f.periodo} className="hover:bg-[#EEEBF3]/30">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{f.periodo}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{f.fechas.map(fmtFecha).join(" · ")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{f.iva > 0.005 ? fmtEur(f.iva) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{f.irpf > 0.005 ? fmtEur(f.irpf) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{f.is > 0.005 ? fmtEur(f.is) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(f.iva + f.irpf + f.is)}</td>
                    </tr>
                  ))}
                  {filas.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No hay pagos de impuestos registrados en Holded este año.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#2E1A47]">
                    <td className="px-4 py-3.5 text-sm font-black text-white uppercase tracking-wide" colSpan={2}>Total</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(totIva)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(totIrpf)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-bold text-white/80 whitespace-nowrap">{fmtEur(totIs)}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-black text-[#FFC845] whitespace-nowrap">{fmtEur(totIva + totIrpf + totIs)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
              Cada fila es una liquidación: lo pagado en enero corresponde al 4T del año anterior, lo de abril al 1T, lo de julio al 2T y lo de octubre al 3T. Los importes salen del libro diario de Holded (cargos a las cuentas 4750/4751/473 con salida de banco) — si un pago no aparece, es que aún no está contabilizado en Holded.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
