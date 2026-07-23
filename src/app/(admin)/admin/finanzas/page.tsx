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
    { href: "/admin/finanzas/caja", titulo: "Caja", desc: "El mes en curso: ingresos, gastos, operaciones firmadas y caja de bancos", activo: true },
    { href: "/admin/finanzas/evolucion", titulo: "Evolución del año", desc: "Mes a mes: ingresos, gastos, neto y caja a fin de cada mes", activo: true },
    { href: "/admin/finanzas/ingresos", titulo: "Ingresos", desc: "Facturas de venta, cobros y pendientes por línea de negocio", activo: true },
    { href: "/admin/finanzas/gastos", titulo: "Gastos", desc: "Fijos, variables y tarjetas del mes", activo: true },
    { href: "/admin/finanzas/gastos/fijos", titulo: "Gastos fijos", desc: "Control anual por proveedor (Bearing y Obliviate)", activo: true },
    { href: "/admin/finanzas/impuestos", titulo: "Impuestos", desc: "Lo pagado a Hacienda por liquidación: IVA, IRPF y modelo 202", activo: true },
    { href: "/admin/finanzas/categorias", titulo: "Categorías", desc: "Añadir o quitar categorías de gasto", activo: true },
  ];

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
      <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
