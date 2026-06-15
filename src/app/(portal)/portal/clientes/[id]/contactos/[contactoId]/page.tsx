import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, contactNotes, operations, avalDocuments } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import DocumentsSection from "@/components/DocumentsSection";
import { fmtEur } from "@/lib/format";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import NotesSection from "@/components/NotesSection";
import ContactoEditForm from "./ContactoEditForm";

export default async function ContactoDetallePage({ params }: { params: Promise<{ id: string; contactoId: string }> }) {
  const { id: clientId, contactoId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as any).collaboratorId as string;

  const [client] = await db.select({ id: clients.id, nombre: clients.nombre })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.collaborator_id, userId))).limit(1);
  if (!client) notFound();

  const [contacto] = await db.select().from(contacts).where(and(eq(contacts.id, contactoId), eq(contacts.client_id, clientId))).limit(1);
  if (!contacto) notFound();

  const notes = await db.select().from(contactNotes).where(eq(contactNotes.contact_id, contactoId)).orderBy(contactNotes.created_at);

  const opsAvaladas = await db.select({
    id: operations.id,
    nombre: operations.nombre,
    pipeline_key: operations.pipeline_key,
    fase: operations.fase,
    status: operations.status,
    importe: operations.importe,
    created_at: operations.created_at,
  }).from(operations).where(eq(operations.aval_contact_id, contactoId)).orderBy(operations.created_at);

  const opAvaladaIds = opsAvaladas.map(o => o.id);
  const avalDocs = opAvaladaIds.length > 0
    ? await db.select().from(avalDocuments).where(inArray(avalDocuments.operation_id, opAvaladaIds)).orderBy(avalDocuments.created_at)
    : [];

  const inicial = contacto.nombre.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-6 pb-2 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/portal/clientes" className="hover:text-[#2E1A47] font-medium">Mis clientes</Link>
        <span>/</span>
        <Link href={`/portal/clientes/${clientId}`} className="hover:text-[#2E1A47] font-medium">{client.nombre}</Link>
        <span>/</span>
        <span className="text-[#2E1A47] font-semibold">{contacto.nombre}</span>
      </div>

      <div className="mx-8 mb-6 bg-[#2E1A47] flex items-center gap-5 px-8 py-6">
        <div className="h-14 w-14 bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{inicial}</div>
        <div>
          <p className="text-white/50 text-xs mb-0.5">Contacto de {client.nombre}</p>
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
                      <Link href={`/portal/clientes/${clientId}`} className="text-sm text-[#2E1A47] font-semibold hover:underline">{client.nombre} →</Link>
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
            <div className="px-5 pb-4">
              <ContactoEditForm contactoId={contactoId} initial={{
                nombre: contacto.nombre,
                email: contacto.email ?? null,
                telefono: contacto.telefono ?? null,
                rol: contacto.rol ?? null,
                linkedin: contacto.linkedin ?? null,
              }} />
            </div>
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-6">
          {opsAvaladas.length > 0 && (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones avaladas ({opsAvaladas.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {opsAvaladas.map(op => (
                  <Link key={op.id} href={`/portal/operaciones/${op.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#EEEBF3]/30 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{op.nombre ?? "—"}</p>
                      <p className="text-xs text-gray-400">{op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"} · {op.fase} · {fmtEur(op.importe)}</p>
                    </div>
                    <span className="text-xs text-[#2E1A47] font-semibold">Ver →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {avalDocs.length > 0 && (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
                <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Documentación de avalista</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {avalDocs.map(d => (
                  <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.filename}</p>
                    </div>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2E1A47] font-semibold hover:underline">Abrir →</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <NotesSection
            notes={notes}
            apiUrl={`/api/contacts/${contactoId}/notes`}
            currentUserId={userId}
            placeholder="Añade una nota sobre este contacto..."
          />
        </div>
      </div>
    </div>
  );
}
