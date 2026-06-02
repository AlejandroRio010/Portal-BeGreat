import { db } from "@/db";
import { financialEntities } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import NuevaEntidadForm from "./NuevaEntidadForm";

const TIPO_LABEL: Record<string, string> = {
  banco: "Banco",
  alternativa_financiera: "Financiación alternativa",
  renting: "Entidad de renting",
};
const TIPO_STYLE: Record<string, string> = {
  banco: "bg-blue-50 text-blue-700 border border-blue-200",
  alternativa_financiera: "bg-amber-50 text-amber-700 border border-amber-200",
  renting: "bg-violet-50 text-violet-700 border border-violet-200",
};

export default async function EntidadesPage() {
  const entidades = await db.select().from(financialEntities).orderBy(asc(financialEntities.tipo), asc(financialEntities.nombre));

  const byTipo = entidades.reduce<Record<string, typeof entidades>>((acc, e) => {
    if (!acc[e.tipo]) acc[e.tipo] = [];
    acc[e.tipo].push(e);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entidades financieras</h1>
        <p className="text-sm text-gray-400 mt-1">{entidades.length} entidades registradas</p>
      </div>

      {/* Sections by type */}
      <div className="space-y-6 mb-8">
        {(["banco", "alternativa_financiera", "renting"] as const).map((tipo) => {
          const items = byTipo[tipo] ?? [];
          return (
            <div key={tipo} className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-6 py-3 border-b border-gray-100 flex items-center gap-3">
                <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">{TIPO_LABEL[tipo]}</p>
                <span className="text-xs text-gray-400">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="px-6 py-6 text-sm text-gray-400">Sin entidades de este tipo todavía.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
                      <th className="text-left px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto</th>
                      <th className="text-left px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</th>
                      <th className="text-left px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Web</th>
                      <th className="px-6 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((e) => (
                      <tr key={e.id} className="hover:bg-[#EEEBF3]/20 transition-colors">
                        <td className="px-6 py-3.5">
                          <Link href={`/admin/entidades/${e.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline">
                            {e.nombre}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{e.persona_contacto ?? "—"}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{e.contacto_email ?? e.email ?? "—"}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{e.contacto_telefono ?? e.telefono ?? "—"}</td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">
                          {e.web ? (
                            <a href={e.web} target="_blank" rel="noopener noreferrer" className="text-[#2E1A47] hover:underline truncate max-w-[160px] block">{e.web.replace(/^https?:\/\//, "")}</a>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link href={`/admin/entidades/${e.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* New entity form */}
      <NuevaEntidadForm />
    </div>
  );
}
