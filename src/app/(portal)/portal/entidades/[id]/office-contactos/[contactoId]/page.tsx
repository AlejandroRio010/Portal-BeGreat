import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, entityOfficeContacts, officeContactNotes, financialEntities, entityOffices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";

export const dynamic = "force-dynamic";

export default async function PortalOfficeContactoPage({ params }: { params: Promise<{ id: string; contactoId: string }> }) {
  const { id: entityId, contactoId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const userId = (session.user as any).collaboratorId as string;

  const [colab] = await db.select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if ((colab?.nivel_entidades ?? 4) > 1) notFound();

  const [entity] = await db.select({ id: financialEntities.id, nombre: financialEntities.nombre })
    .from(financialEntities).where(eq(financialEntities.id, entityId)).limit(1);
  if (!entity) notFound();

  const [contacto] = await db.select({
    id: entityOfficeContacts.id,
    nombre: entityOfficeContacts.nombre,
    rol: entityOfficeContacts.rol,
    email: entityOfficeContacts.email,
    telefono: entityOfficeContacts.telefono,
    linkedin: entityOfficeContacts.linkedin,
    officeNombre: entityOffices.nombre,
    officeCiudad: entityOffices.ciudad,
  }).from(entityOfficeContacts)
    .leftJoin(entityOffices, eq(entityOfficeContacts.office_id, entityOffices.id))
    .where(eq(entityOfficeContacts.id, contactoId)).limit(1);
  if (!contacto) notFound();

  const notes = await db.select().from(officeContactNotes)
    .where(eq(officeContactNotes.contact_id, contactoId)).orderBy(officeContactNotes.created_at);

  const inicial = contacto.nombre.charAt(0).toUpperCase();
  const oficina = [contacto.officeNombre, contacto.officeCiudad].filter(Boolean).join(" — ");

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/entidades" className="hover:text-[#2E1A47] font-medium">Entidades</Link>
        <span>/</span>
        <Link href={`/portal/entidades/${entityId}`} className="hover:text-[#2E1A47] font-medium">{entity.nombre}</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{contacto.nombre}</span>
      </div>

      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center gap-5 px-8 py-6">
        <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{inicial}</div>
        <div>
          <p className="text-white/50 text-xs mb-0.5">Contacto de {entity.nombre}</p>
          <p className="text-white text-xl font-bold">{contacto.nombre}</p>
          {contacto.rol && <p className="text-white/60 text-xs mt-0.5">{contacto.rol}</p>}
        </div>
      </div>

      <div className="mx-8 grid grid-cols-3 gap-5 items-start">
        <div>
          <div className="bg-white border border-gray-200">
            <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de contacto</h3>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-50">
              <div className="py-3 flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Nombre</span>
                <span className="text-sm text-gray-800 font-medium">{contacto.nombre}</span>
              </div>
              <div className="py-3 flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Empresa</span>
                <Link href={`/portal/entidades/${entityId}`} className="text-sm text-[#2E1A47] font-semibold hover:underline">{entity.nombre} →</Link>
              </div>
              {oficina && (
                <div className="py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Oficina</span>
                  <span className="text-sm text-gray-800 font-medium">{oficina}</span>
                </div>
              )}
              {contacto.rol && (
                <div className="py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Puesto / Rol</span>
                  <span className="text-sm text-gray-800 font-medium">{contacto.rol}</span>
                </div>
              )}
              {contacto.linkedin && (
                <div className="py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">LinkedIn</span>
                  <a href={contacto.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-semibold">LinkedIn →</a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <NotesSection
            notes={notes}
            apiUrl={`/api/office-contacts/${contactoId}/notes`}
            currentUserId={userId}
            placeholder="Añade una nota sobre este contacto..."
            canPin
          />
        </div>
      </div>
    </div>
  );
}
