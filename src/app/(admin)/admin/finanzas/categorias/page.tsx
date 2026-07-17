import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategorias } from "@/lib/categorias";
import { getGastosFijos } from "@/lib/gastosFijos";
import { AddCategoriaForm, CategoriaRow } from "./CategoriasManage";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") notFound();

  const [cats, fijos] = await Promise.all([getCategorias("gasto"), getGastosFijos()]);
  // Cuántos gastos fijos usan cada categoría (para avisar al quitarla)
  const usos = new Map<string, number>();
  for (const f of fijos) if (f.categoria) usos.set(f.categoria, (usos.get(f.categoria) ?? 0) + 1);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin/finanzas" className="hover:text-[#2E1A47]">Finanzas</Link><span>/</span>
          <span className="text-gray-600 font-medium">Categorías</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Categorías de gasto</h1>
        <p className="text-sm text-gray-400 mt-1">
          Estas son las categorías que aparecen al etiquetar un <Link href="/admin/finanzas/gastos/fijos" className="text-[#2E1A47] hover:underline">gasto fijo</Link>. Añade o quita las que quieras.
        </p>
      </div>

      <div className="max-w-xl">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#EEEBF3] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Categorías</h2>
            <span className="text-[10px] text-[#2E1A47]/50">{cats.length}</span>
          </div>
          <div className="p-2 divide-y divide-gray-50">
            {cats.length === 0 && <p className="px-3 py-8 text-center text-xs text-gray-300">Aún no hay categorías. Añade la primera abajo.</p>}
            {cats.map(c => (
              <CategoriaRow key={c.id} id={c.id} nombre={c.nombre} usos={usos.get(c.nombre) ?? 0} />
            ))}
          </div>
          <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
            <AddCategoriaForm tipo="gasto" />
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          Los gastos que llegan de Holded se clasifican solos por su cuenta contable (no por esta lista); estas categorías son para etiquetar a mano tus gastos fijos. Las categorías de <b>ingresos</b> vienen automáticas de Holded.
        </p>
      </div>
    </div>
  );
}
