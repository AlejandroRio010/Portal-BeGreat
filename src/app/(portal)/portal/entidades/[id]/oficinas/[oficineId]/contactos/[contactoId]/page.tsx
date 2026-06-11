import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, entityOfficeContacts, entityOffices, financialEntities, officeContactNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";

export default async function PortalContactoOficinaPage({
  params,
}: {
  params: Promise<{ id: string; oficineId: string; contactoId: string }>;
}) {
  const { id: entityId, oficineId, contactoId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user!.id as string;
  const [colab] = await db.select({ nivel_entidades: collaborators.nivel_entidades }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if ((colab?.nivel_entidades ?? 4) > 1) notFound();

  const [contacto] = await db.select().from(entityOfficeContacts).where(eq(entityOfficeContacts.id, contactoId)).limit(1);
  if (!contacto) notFound();

  const notes = await db.select().from(officeContactNotes).where(eq(officeContactNotes.contact_id, contactoId)).orderBy(officeContactNotes.created_at);
  const [oficina] = await db.select({ nombre: entityOffices.nombre }).from(entityOffices).where(eq(entityOffices.id, oficineId)).limit(1);
  const [entidad] = await db.select({ nombre: financialEntities.nombre }).from(financialEntities).where(eq(financialEntities.id, entityId)).limit(1);

  const inicial = contacto.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
        <Link href="/portal/entidades" className="hover:text-[#2E1A47] font-medium">Entidades financieras</Link>
        <span>/</span>
        <Link href={`/portal/entidades/${entityId}`} className="hover:text-[#2E1A47] font-medium">{entidad?.nombre}</Link>
        <span>/</span>
        <Link href={`/portal/entidades/${entityId}/oficinas/${oficineId}`} className="hover:text-[#2E1A47] font-medium">{oficina?.nombre}</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{contacto.nombre}</span>
      </div>

      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center gap-5 px-8 py-6">
        <div className="h-16 w-16 bg-white/20 flex items-center justify-center text-white text-2xl font-bold select-none flex-shrink-0">
          {inicial}
        </div>
        <div>
          <p className="text-white text-xl font-bold">{contacto.nombre}</p>
          {contacto.rol && <p className="text-white/70 text-sm mt-0.5">{contacto.rol}</p>}
          <p className="text-white/40 text-xs mt-1">{entidad?.nombre} — {oficina?.nombre}</p>
        </div>
      </div>

      <div className="mx-8 mb-6 grid grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de contacto</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              {[
                { label: "Puesto", value: contacto.rol },
                { label: "Email", value: contacto.email, href: contacto.email ? `mailto:${contacto.email}` : undefined },
                { label: "Teléfono", value: contacto.telefono, href: contacto.telefono ? `tel:${contacto.telefono}` : undefined },
                { label: "LinkedIn", value: contacto.linkedin, href: contacto.linkedin ?? undefined, linkLabel: "LinkedIn →" },
              ].map(field => field.value ? (
                <div key={field.label} className="py-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{field.label}</span>
                  {field.href ? (
                    <a href={field.href} target={field.label === "LinkedIn" ? "_blank" : undefined} rel="noopener noreferrer"
                      className="text-sm text-[#2E1A47] hover:underline font-medium">{field.linkLabel ?? field.value}</a>
                  ) : (
                    <span className="text-sm text-gray-800 font-medium">{field.value}</span>
                  )}
                </div>
              ) : null)}
              {contacto.notas && (
                <div className="py-2.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold block mb-1">Notas</span>
                  <span className="text-sm text-gray-700">{contacto.notas}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Oficina</p>
            <Link href={`/portal/entidades/${entityId}/oficinas/${oficineId}`} className="text-sm font-semibold text-[#2E1A47] hover:underline">
              {oficina?.nombre} →
            </Link>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-3 mb-1">Entidad</p>
            <Link href={`/portal/entidades/${entityId}`} className="text-sm font-semibold text-[#2E1A47] hover:underline">
              {entidad?.nombre} →
            </Link>
          </div>
        </div>

        <div className="col-span-2">
          <NotesSection
            notes={notes}
            apiUrl={`/api/admin/entidades/oficinas/contactos/${contactoId}/notes`}
            currentUserId={userId}
            placeholder="Añade una nota sobre esta persona de contacto..."
          />
        </div>
      </div>
    </div>
  );
}
