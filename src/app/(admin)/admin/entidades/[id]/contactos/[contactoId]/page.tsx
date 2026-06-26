import { db } from "@/db";
import { auth } from "@/lib/auth";
import { entityContacts, entityContactNotes, financialEntities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";

export const dynamic = "force-dynamic";

export default async function AdminEntityContactoPage({ params }: { params: Promise<{ id: string; contactoId: string }> }) {
  const { id: entityId, contactoId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const [entity] = await db.select({ id: financialEntities.id, nombre: financialEntities.nombre })
    .from(financialEntities).where(eq(financialEntities.id, entityId)).limit(1);
  if (!entity) notFound();

  const [contacto] = await db.select().from(entityContacts)
    .where(and(eq(entityContacts.id, contactoId), eq(entityContacts.entity_id, entityId))).limit(1);
  if (!contacto) notFound();

  const notes = await db.select().from(entityContactNotes)
    .where(eq(entityContactNotes.contact_id, contactoId)).orderBy(entityContactNotes.created_at);

  const inicial = contacto.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/entidades" className="hover:text-[#2E1A47] font-medium">Entidades</Link>
        <span>/</span>
        <Link href={`/admin/entidades/${entityId}`} className="hover:text-[#2E1A47] font-medium">{entity.nombre}</Link>
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
              {([
                ["Nombre", contacto.nombre],
                ["Empresa", null],
                ["Puesto / Rol", contacto.rol],
                ["Email", contacto.email],
                ["Teléfono", contacto.telefono],
                ["LinkedIn", contacto.linkedin],
              ] as [string, string | null][]).map(([label, value]) => {
                if (label === "Empresa") {
                  return (
                    <div key={label} className="py-3 flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                      <Link href={`/admin/entidades/${entityId}`} className="text-sm text-[#2E1A47] font-semibold hover:underline">{entity.nombre} →</Link>
                    </div>
                  );
                }
                if (!value) return null;
                return (
                  <div key={label} className="py-3 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                    {label === "Email" ? (
                      <a href={`mailto:${value}`} className="text-sm text-[#2E1A47] hover:underline font-medium">{value}</a>
                    ) : label === "LinkedIn" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-semibold">LinkedIn →</a>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium">{value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <NotesSection
            notes={notes}
            apiUrl={`/api/entity-contacts/${contactoId}/notes`}
            currentUserId={userId}
            isAdmin={true}
            placeholder="Añade una nota sobre este contacto..."
            canPin
          />
        </div>
      </div>
    </div>
  );
}
