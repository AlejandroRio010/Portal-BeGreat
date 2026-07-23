import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFacturasVenta, getGastos } from "@/lib/holded";
import { fmtEur } from "@/lib/format";

export const dynamic = "force-dynamic";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function FinanzasHubPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const hoy = new Date();
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  // Todo en BASE (sin IVA): el negocio se mira sin IVA; el IVA va aparte.
  let cobrado = 0, pagadoGasto = 0, ok = true;
  try {
    const [ventas, gastos] = await Promise.all([getFacturasVenta(), getGastos()]);
    cobrado = ventas.filter(f => f.date.startsWith(mes) && f.estado === "cobrada").reduce((s, f) => s + f.subtotal, 0);
    pagadoGasto = gastos.filter(g => g.date.startsWith(mes)).reduce((s, g) => s + g.subtotal, 0);
  } catch { ok = false; }
  const neto = cobrado - pagadoGasto;

  const secciones = [
    { href: "/admin/finanzas/caja", titulo: "Caja", desc: "El mes en curso: ingresos, gastos, operaciones firmadas y caja de bancos", activo: true },
    { href: "/admin/finanzas/evolucion", titulo: "Evolución del año", desc: "Mes a mes: ingresos, gastos, neto y caja a fin de cada mes", activo: true },
    { href: "/admin/finanzas/ingresos", titulo: "Ingresos", desc: "Facturas de venta, cobros y pendientes por línea de negocio", activo: true },
    { href: "/admin/finanzas/gastos", titulo: "Gastos", desc: "Fijos, variables y tarjetas del mes", activo: true },
    { href: "/admin/finanzas/gastos/fijos", titulo: "Gastos fijos", desc: "Control anual por proveedor (Bearing y Obliviate)", activo: true },
    { href: "/admin/finanzas/categorias", titulo: "Categorías", desc: "Añadir o quitar categorías de gasto", activo: true },
    { href: "/admin/finanzas/impuestos", titulo: "Impuestos", desc: "Lo pagado a Hacienda por liquidación: IVA, IRPF y modelo 202", activo: true },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-400 mt-1">Bearing Point S.L. · control de caja en tiempo real desde Holded</p>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-[#2E1A47] px-6 py-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Cobrado en {MESES[hoy.getMonth()]} · sin IVA</p>
          <p className="text-3xl font-black text-white">{ok ? fmtEur(cobrado) : "—"}</p>
        </div>
        <div className="bg-[#2E1A47] px-6 py-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Gastado en {MESES[hoy.getMonth()]} · sin IVA</p>
          <p className="text-3xl font-black text-white">{ok ? fmtEur(pagadoGasto) : "—"}</p>
        </div>
        <div className={`px-6 py-6 border ${neto >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${neto >= 0 ? "text-emerald-600" : "text-red-600"}`}>Neto del mes {neto >= 0 ? "· hemos ganado" : "· en negativo"}</p>
          <p className={`text-3xl font-black ${neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>{ok ? fmtEur(neto) : "—"}</p>
        </div>
      </div>

      {/* Accesos a secciones */}
      <div className="grid grid-cols-2 gap-4">
        {secciones.map(s => s.activo ? (
          <Link key={s.titulo} href={s.href}
            className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#2E1A47]/40 hover:shadow-md transition-all flex items-start gap-4">
            <span className="mt-2 w-2.5 h-2.5 rounded-sm bg-[#FFC845] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 group-hover:text-[#2E1A47]">{s.titulo}</p>
              <p className="text-sm text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            <span className="text-[#2E1A47] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        ) : (
          <div key={s.titulo} className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 flex items-start gap-4 opacity-70">
            <span className="mt-2 w-2.5 h-2.5 rounded-sm bg-gray-300 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-400">{s.titulo}</p>
              <p className="text-sm text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide bg-white border border-gray-200 px-2 py-0.5 rounded-full">Próximamente</span>
          </div>
        ))}
      </div>
    </div>
  );
}
