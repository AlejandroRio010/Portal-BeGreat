import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getResumenCaja } from "@/lib/cajaResumen";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function FinanzasHubPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const anyo = hoy.getFullYear();
  const mesIdx = hoy.getMonth();

  // El MISMO motor que la página de Caja: así los KPIs del hub y el detalle
  // del mes cuentan siempre lo mismo (fijos + variables + nóminas + tarjetas).
  let ok = true;
  let ingresos = 0, cobrado = 0, salidas = 0, neto = 0;
  try {
    const { holdedError, meses } = await getResumenCaja(anyo);
    if (holdedError) ok = false;
    else {
      const M = meses[mesIdx];
      ingresos = M.ingresos; cobrado = M.cobrado; salidas = M.salidas; neto = M.neto;
    }
  } catch { ok = false; }

  const secciones = [
    { href: "/admin/finanzas/caja", titulo: "Resumen mensual", desc: "El mes en curso: ingresos, gastos, operaciones firmadas y caja de bancos", activo: true },
    { href: "/admin/finanzas/evolucion", titulo: "Evolución del año", desc: "Mes a mes: ingresos, gastos, neto y caja a fin de cada mes", activo: true },
    { href: "/admin/finanzas/ingresos-gastos", titulo: "Ingresos y gastos", desc: "Todo el detalle: facturas de venta, gastos, fijos y categorías", activo: true },
    { href: "/admin/finanzas/impuestos", titulo: "Impuestos", desc: "Lo pagado a Hacienda por liquidación: IVA, IRPF y modelos 202/200", activo: true },
  ];

  // Resumen 2025 (cifras oficiales del cierre: modelo 200 presentado jul-2026)
  const R2025 = {
    ingresos: 467364.71 + 1400,
    aprovisionamientos: 345587.25,
    personal: 47264.0,
    otrosGastos: 49979.0,
    resultadoAntes: 25934.46,
    is: 6224.27,
    resultado: 19710.19,
    cajaFinal: 38927.21,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-400 mt-1">Bearing Point S.L. · control de caja en tiempo real desde Holded</p>
      </div>

      {/* Resumen del mes — mismos números que la página de Caja */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-[#2E1A47] px-6 py-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Ingresos de {MESES[mesIdx]} · sin IVA</p>
          <p className="text-3xl font-black text-white">{ok ? fmtEur(ingresos) : "—"}</p>
          {ok && <p className="text-white/40 text-[10px] mt-1.5 uppercase tracking-wide">cobrado {fmtEur(cobrado)}</p>}
        </div>
        <div className="bg-[#2E1A47] px-6 py-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Gastos de {MESES[mesIdx]} · sin IVA</p>
          <p className="text-3xl font-black text-white">{ok ? fmtEur(salidas) : "—"}</p>
          {ok && <p className="text-white/40 text-[10px] mt-1.5 uppercase tracking-wide">fijos + variables + nóminas + tarjetas + impuestos</p>}
        </div>
        <div className={`px-6 py-6 border ${neto >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>Neto del mes {neto >= 0 ? "· hemos ganado" : "· en negativo"}</p>
          <p className={`text-3xl font-black ${neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{ok ? fmtEur(neto) : "—"}</p>
        </div>
      </div>

      {/* Accesos a secciones */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {secciones.map(s => (
          <Link key={s.titulo} href={s.href}
            className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#2E1A47]/40 hover:shadow-md transition-all flex items-start gap-4">
            <span className="mt-2 w-2.5 h-2.5 rounded-sm bg-[#FFC845] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 group-hover:text-[#2E1A47]">{s.titulo}</p>
              <p className="text-sm text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            <span className="text-[#2E1A47] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        ))}
      </div>

      {/* Resumen del ejercicio 2025 (cifras oficiales del cierre / modelo 200) */}
      <section className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#2E1A47] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Así cerró 2025</h2>
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">cifras del cierre oficial (modelo 200)</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-50">
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Ingresos</p>
            <p className="text-xl font-black text-[#2E1A47]">{fmtEur(R2025.ingresos)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Gastos</p>
            <p className="text-xl font-black text-[#2E1A47]">{fmtEur(R2025.aprovisionamientos + R2025.personal + R2025.otrosGastos)}</p>
            <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">mercadería {fmtEur(R2025.aprovisionamientos)} · personal {fmtEur(R2025.personal)} · resto {fmtEur(R2025.otrosGastos)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Resultado</p>
            <p className="text-xl font-black text-emerald-700">{fmtEur(R2025.resultado)}</p>
            <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">antes de impuestos {fmtEur(R2025.resultadoAntes)} · IS −{fmtEur(R2025.is)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Caja a 31/12/2025</p>
            <p className="text-xl font-black text-[#2E1A47]">{fmtEur(R2025.cajaFinal)}</p>
            <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">saldo real de los tres bancos</p>
          </div>
        </div>
      </section>
    </div>
  );
}
