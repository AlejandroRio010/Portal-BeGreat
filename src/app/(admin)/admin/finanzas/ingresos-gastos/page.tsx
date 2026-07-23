import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Sub-hub de ingresos y gastos: todo el detalle del día a día vive aquí.
export default async function IngresosGastosHubPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const secciones = [
    { href: "/admin/finanzas/ingresos", titulo: "Ingresos", desc: "Facturas de venta, cobros y pendientes por línea de negocio" },
    { href: "/admin/finanzas/gastos", titulo: "Gastos del mes", desc: "Fijos, variables y tarjetas, con su detalle" },
    { href: "/admin/finanzas/gastos/fijos", titulo: "Gastos fijos", desc: "Control anual por proveedor (Bearing y Obliviate)" },
    { href: "/admin/finanzas/categorias", titulo: "Categorías", desc: "Añadir o quitar categorías de gasto" },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span><span className="text-gray-600 font-medium">Ingresos y gastos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finanzas — Ingresos y gastos</h1>
        <p className="text-sm text-gray-400 mt-1">Todo el detalle del día a día: facturas, gastos y su clasificación</p>
      </div>

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
