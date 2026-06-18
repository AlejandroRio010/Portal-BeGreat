import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, financialEntities, entityOffices, entityContacts, entityNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import ContactosPanel from "@/app/(admin)/admin/entidades/[id]/ContactosPanel";
import AddOfficeButton from "./AddOfficeButton";

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

export default async function PortalEntidadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as any).collaboratorId as string;
  const [colab] = await db
    .select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  const nivel = colab?.nivel_entidades ?? 4;
  if (nivel > 2) notFound();

  const [entidad] = await db.select().from(financialEntities).where(eq(financialEntities.id, id)).limit(1);
  if (!entidad) notFound();

  const oficinas = await db.select().from(entityOffices).where(eq(entityOffices.entity_id, id)).orderBy(entityOffices.nombre);
  const contactos = nivel === 1
    ? await db.select().from(entityContacts).where(eq(entityContacts.entity_id, id)).orderBy(entityContacts.created_at)
    : [];
  const notes = nivel <= 2
    ? await db.select().from(entityNotes).where(eq(entityNotes.entity_id, id)).orderBy(entityNotes.created_at)
    : [];

  const inicial = entidad.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/entidades" className="hover:text-[#2E1A47] font-medium">Entidades financieras</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{entidad.nombre}</span>
      </div>

      {/* Banner */}
      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-5">
          {entidad.logo_url ? (
            <img src={entidad.logo_url} alt={entidad.nombre} className="h-14 w-14 object-contain bg-white p-1" />
          ) : (
            <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{inicial}</div>
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
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">{oficinas.length} oficina{oficinas.length !== 1 ? "s" : ""}</span>
          <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIPO_COLOR[entidad.tipo]}`}>
            {TIPO_LABEL[entidad.tipo]}
          </span>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        {/* Col 1: Datos generales */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos generales</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {(nivel === 1
                ? [["Email", entidad.email], ["Teléfono", entidad.telefono], ["Web", entidad.web], ["LinkedIn", entidad.linkedin]]
                : [["Web", entidad.web]]
              ).map(([label, value]) =>
                value ? (
                  <div key={label} className="py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "LinkedIn" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-semibold">LinkedIn →</a>
                    ) : label === "Web" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {nivel === 1 && (entidad.persona_contacto || entidad.contacto_email || entidad.contacto_telefono) && (
            <div className="bg-white border border-gray-200">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contacto principal</h3>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {([["Nombre", entidad.persona_contacto], ["Email", entidad.contacto_email], ["Teléfono", entidad.contacto_telefono]] as [string, string | null][]).map(([label, value]) =>
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

          {nivel === 1 && <ContactosPanel contactos={contactos} entityId={id} />}
        </div>

        {/* Col 2-3: Notas + Oficinas */}
        <div className="col-span-2 flex flex-col gap-6">
          {nivel <= 2 && (
            <NotesSection
              notes={notes}
              apiUrl={`/api/portal/entidades/${id}/notes`}
              currentUserId={userId}
              readOnly={nivel === 2}
            />
          )}

          {/* Oficinas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Oficinas / Sucursales</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{oficinas.length} oficina{oficinas.length !== 1 ? "s" : ""}</span>
                {nivel === 1 && <AddOfficeButton entityId={id} />}
              </div>
            </div>

            {oficinas.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {oficinas.map(o => nivel === 1 ? (
                  <Link key={o.id} href={`/portal/entidades/${id}/oficinas/${o.id}`}
                    className="bg-white border border-gray-200 p-4 hover:border-[#2E1A47]/40 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] text-sm font-bold">
                        {o.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[#2E1A47] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#2E1A47] leading-tight mb-1">{o.nombre}</p>
                    {o.ciudad && <p className="text-xs text-gray-400">{o.ciudad}</p>}
                    {o.persona_contacto && <p className="text-xs text-gray-400 mt-0.5 truncate">{o.persona_contacto}</p>}
                  </Link>
                ) : (
                  <div key={o.id} className="bg-white border border-gray-200 p-4">
                    <div className="mb-2">
                      <div className="w-8 h-8 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] text-sm font-bold">
                        {o.nombre.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">{o.nombre}</p>
                    {o.ciudad && <p className="text-xs text-gray-400">{o.ciudad}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin oficinas registradas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
