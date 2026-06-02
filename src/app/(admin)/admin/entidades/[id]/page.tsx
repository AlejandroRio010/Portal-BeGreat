import { db } from "@/db";
import { financialEntities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EntidadEditForm from "./EntidadEditForm";

const TIPO_LABEL: Record<string, string> = {
  banco: "Banco",
  alternativa_financiera: "Financiación alternativa",
  renting: "Entidad de renting",
};
const TIPO_COLOR: Record<string, string> = {
  banco: "bg-blue-50 text-blue-700 border border-blue-200",
  alternativa_financiera: "bg-amber-50 text-amber-700 border border-amber-200",
  renting: "bg-violet-50 text-violet-700 border border-violet-200",
};

export default async function EntidadFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [entidad] = await db
    .select()
    .from(financialEntities)
    .where(eq(financialEntities.id, id))
    .limit(1);

  if (!entidad) notFound();

  const inicial = entidad.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/entidades" className="hover:text-[#2E1A47] font-medium">Entidades financieras</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{entidad.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          {entidad.logo_url ? (
            <img src={entidad.logo_url} alt={entidad.nombre} className="h-14 w-14 object-contain bg-white p-1" />
          ) : (
            <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {inicial}
            </div>
          )}
          <div>
            <p className="text-white text-xl font-bold">{entidad.nombre}</p>
            {entidad.web && (
              <a href={entidad.web} target="_blank" rel="noopener noreferrer" className="text-white/50 text-xs hover:text-white/80 mt-0.5 block">
                {entidad.web.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIPO_COLOR[entidad.tipo]}`}>
          {TIPO_LABEL[entidad.tipo]}
        </span>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Datos + Contacto */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos generales</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                ["Email", entidad.email],
                ["Teléfono", entidad.telefono],
                ["Web", entidad.web],
                ["LinkedIn", entidad.linkedin],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Web" || label === "LinkedIn" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {(entidad.persona_contacto || entidad.contacto_email || entidad.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Persona de contacto</h3>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {[
                  ["Nombre", entidad.persona_contacto],
                  ["Email", entidad.contacto_email],
                  ["Teléfono", entidad.contacto_telefono],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="py-2.5 flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {entidad.notas && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Notas internas</h3>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{entidad.notas}</p>
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="col-span-2">
          <EntidadEditForm entidad={entidad} />
        </div>
      </div>
    </div>
  );
}
