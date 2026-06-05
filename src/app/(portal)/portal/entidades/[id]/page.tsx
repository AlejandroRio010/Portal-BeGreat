import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, financialEntities, entityOffices, entityContacts, entityOfficeContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function PortalEntidadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user!.id as string;
  const [colab] = await db
    .select({ puede_ver_entidades: collaborators.puede_ver_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);

  if (!colab?.puede_ver_entidades) notFound();

  const [entity] = await db.select().from(financialEntities).where(eq(financialEntities.id, id)).limit(1);
  if (!entity) notFound();

  const offices = await db.select().from(entityOffices).where(eq(entityOffices.entity_id, id));
  const contacts = await db.select().from(entityContacts).where(eq(entityContacts.entity_id, id));

  const TIPO_LABEL: Record<string, string> = {
    banco: "Banco", alternativa_financiera: "Financiación alternativa", renting: "Entidad de renting",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/portal/entidades" className="text-xs text-gray-400 hover:text-[#2E1A47] mb-6 inline-block">← Volver a entidades</Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 p-6 mb-5 flex items-center gap-5">
        {entity.logo_url ? (
          <img src={entity.logo_url} alt={entity.nombre} className="w-14 h-14 object-contain" />
        ) : (
          <div className="w-14 h-14 bg-[#EEEBF3] flex items-center justify-center">
            <span className="text-xl font-bold text-[#2E1A47]">{entity.nombre.charAt(0)}</span>
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-[#2E1A47]">{entity.nombre}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{TIPO_LABEL[entity.tipo] ?? entity.tipo}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Datos */}
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos de contacto</p>
          <dl className="space-y-3">
            {entity.telefono && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Teléfono</dt><dd className="text-sm text-gray-800">{entity.telefono}</dd></div>}
            {entity.email && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Email</dt><dd className="text-sm text-gray-800">{entity.email}</dd></div>}
            {entity.web && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Web</dt><dd><a href={entity.web} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline">{entity.web}</a></dd></div>}
            {entity.persona_contacto && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Contacto principal</dt><dd className="text-sm text-gray-800">{entity.persona_contacto}</dd></div>}
            {entity.contacto_email && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Email contacto</dt><dd className="text-sm text-gray-800">{entity.contacto_email}</dd></div>}
            {entity.contacto_telefono && <div><dt className="text-[10px] text-gray-400 uppercase tracking-wider">Tel. contacto</dt><dd className="text-sm text-gray-800">{entity.contacto_telefono}</dd></div>}
          </dl>
        </div>

        {/* Contactos */}
        {contacts.length > 0 && (
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Personas de contacto</p>
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                  {c.rol && <p className="text-xs text-gray-400">{c.rol}</p>}
                  {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                  {c.telefono && <p className="text-xs text-gray-500">{c.telefono}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Oficinas */}
        {offices.length > 0 && (
          <div className="col-span-2 bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Oficinas ({offices.length})</p>
            <div className="grid grid-cols-2 gap-3">
              {offices.map(o => (
                <div key={o.id} className="border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-800">{o.nombre}</p>
                  {o.ciudad && <p className="text-xs text-gray-400">{o.ciudad}</p>}
                  {o.persona_contacto && <p className="text-xs text-gray-500 mt-1">{o.persona_contacto}</p>}
                  {o.contacto_email && <p className="text-xs text-gray-500">{o.contacto_email}</p>}
                  {o.contacto_telefono && <p className="text-xs text-gray-500">{o.contacto_telefono}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
