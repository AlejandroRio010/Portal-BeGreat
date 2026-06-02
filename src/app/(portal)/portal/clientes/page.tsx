import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";

export default async function ClientesPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  // Get all clients for this collaborator
  const myClients = await db
    .select()
    .from(clients)
    .where(eq(clients.collaborator_id, userId))
    .orderBy(clients.created_at);

  // Get all contacts for those clients
  const clientIds = myClients.map((c) => c.id);
  const allContactsAll = clientIds.length > 0
    ? await db.select().from(contacts).where(inArray(contacts.client_id, clientIds))
    : [];

  // Group contacts by client_id
  const contactsByClient = allContactsAll.reduce<Record<string, typeof allContactsAll>>((acc, c) => {
    if (!acc[c.client_id]) acc[c.client_id] = [];
    acc[c.client_id].push(c);
    return acc;
  }, {});

  // Get operations count per client
  const allOps = await db
    .select({ client_id: operations.client_id, status: operations.status, pipeline_key: operations.pipeline_key })
    .from(operations)
    .where(eq(operations.collaborator_id, userId));

  const opsByClient = allOps.reduce<Record<string, typeof allOps>>((acc, o) => {
    if (!o.client_id) return acc;
    if (!acc[o.client_id]) acc[o.client_id] = [];
    acc[o.client_id].push(o);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis clientes</h1>
          <p className="text-sm text-gray-400 mt-1">
            {myClients.length} empresa{myClients.length !== 1 ? "s" : ""} registrada{myClients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/portal/alta-operacion"
          className="inline-flex items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors"
        >
          + Nueva operación
        </Link>
      </div>

      {myClients.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm mb-1">Todavía no has registrado ningún cliente.</p>
          <p className="text-xs text-gray-300">Los clientes se crean automáticamente cuando das de alta una operación.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myClients.map((client) => {
            const clientContacts = contactsByClient[client.id] ?? [];
            const clientOps = opsByClient[client.id] ?? [];
            const opsActivas = clientOps.filter((o) => o.status === "activa").length;
            const opsPendientes = clientOps.filter((o) => o.status === "pendiente_de_validar").length;

            return (
              <div key={client.id} className="bg-white border border-gray-200">
                {/* Client header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#2E1A47] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {client.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{client.nombre}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="text-xs text-gray-400 hover:text-[#2E1A47] transition-colors">
                            {client.email}
                          </a>
                        )}
                        {client.telefono && (
                          <span className="text-xs text-gray-400">{client.telefono}</span>
                        )}
                        {client.web && (
                          <a href={client.web} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-[#2E1A47] transition-colors">
                            {client.web}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Op counts */}
                  <div className="flex items-center gap-3">
                    {opsActivas > 0 && (
                      <span className="text-xs font-semibold bg-[#EEEBF3] text-[#2E1A47] px-2.5 py-1">
                        {opsActivas} activa{opsActivas !== 1 ? "s" : ""}
                      </span>
                    )}
                    {opsPendientes > 0 && (
                      <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1">
                        {opsPendientes} pendiente{opsPendientes !== 1 ? "s" : ""}
                      </span>
                    )}
                    {clientOps.length === 0 && (
                      <span className="text-xs text-gray-300">Sin operaciones</span>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                {clientContacts.length > 0 ? (
                  <div className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Personas de contacto</p>
                    <div className="grid grid-cols-3 gap-3">
                      {clientContacts.map((contact) => (
                        <div key={contact.id} className="border border-gray-100 bg-gray-50 px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{contact.nombre}</p>
                          {contact.rol && <p className="text-xs text-[#2E1A47] font-medium mt-0.5">{contact.rol}</p>}
                          <div className="mt-2 space-y-0.5">
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="block text-xs text-gray-400 hover:text-[#2E1A47] transition-colors truncate">
                                {contact.email}
                              </a>
                            )}
                            {contact.telefono && (
                              <a href={`tel:${contact.telefono}`} className="block text-xs text-gray-400 hover:text-[#2E1A47] transition-colors">
                                {contact.telefono}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-3">
                    <p className="text-xs text-gray-300">Sin personas de contacto registradas</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
