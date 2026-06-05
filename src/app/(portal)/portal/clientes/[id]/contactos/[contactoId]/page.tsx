import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function ContactoDetallePage({ params }: { params: Promise<{ id: string; contactoId: string }> }) {
  const { id: clientId, contactoId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user!.id as string;

  const [client] = await db.select({ id: clients.id, nombre: clients.nombre })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.collaborator_id, userId))).limit(1);
  if (!client) notFound();

  const [contacto] = await db.select().from(contacts).where(and(eq(contacts.id, contactoId), eq(contacts.client_id, clientId))).limit(1);
  if (!contacto) notFound();

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
          <p className="text-white/50 text-xs mb-0.5">{client.nombre}</p>
          <p className="text-white text-xl font-bold">{contacto.nombre}</p>
          {contacto.rol && <p className="text-white/60 text-xs mt-0.5">{contacto.rol}</p>}
        </div>
      </div>

      <div className="mx-8 max-w-xl">
        <div className="bg-white border border-gray-200">
          <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de contacto</h3>
          </div>
          <div className="px-5 py-4 divide-y divide-gray-50">
            {([
              ["Nombre", contacto.nombre],
              ["Puesto / Rol", contacto.rol],
              ["Email", contacto.email],
              ["Teléfono", contacto.telefono],
              ["LinkedIn", contacto.linkedin],
            ] as [string, string | null][]).map(([label, value]) =>
              value ? (
                <div key={label} className="py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
                  {label === "Email" ? (
                    <a href={`mailto:${value}`} className="text-sm text-[#2E1A47] hover:underline font-medium">{value}</a>
                  ) : label === "LinkedIn" ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E1A47] hover:underline font-medium break-all">{value}</a>
                  ) : (
                    <span className="text-sm text-gray-800 font-medium">{value}</span>
                  )}
                </div>
              ) : null
            )}
            {contacto.notas && (
              <div className="py-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold block mb-1">Notas</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-[#EEEBF3]/40 p-3 border-l-2 border-[#2E1A47]">{contacto.notas}</p>
              </div>
            )}
          </div>
          <div className="px-5 pb-4">
            <Link href={`/portal/clientes/${clientId}`} className="text-xs text-gray-400 hover:text-[#2E1A47]">← Volver a {client.nombre}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
