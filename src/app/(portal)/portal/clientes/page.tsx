import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const myClients = await db
    .select()
    .from(clients)
    .where(eq(clients.collaborator_id, userId))
    .orderBy(clients.nombre);

  const clientIds = myClients.map((c) => c.id);

  const allContacts = clientIds.length > 0
    ? await db.select().from(contacts).where(inArray(contacts.client_id, clientIds))
    : [];

  const contactCountByClient = allContacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.client_id] = (acc[c.client_id] ?? 0) + 1;
    return acc;
  }, {});

  const allOps = clientIds.length > 0
    ? await db
        .select({ client_id: operations.client_id, status: operations.status })
        .from(operations)
        .where(eq(operations.collaborator_id, userId))
    : [];

  const opsByClient = allOps.reduce<Record<string, typeof allOps>>((acc, o) => {
    if (!o.client_id) return acc;
    if (!acc[o.client_id]) acc[o.client_id] = [];
    acc[o.client_id].push(o);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis clientes</h1>
          <p className="text-sm text-gray-400 mt-1">
            {myClients.length} empresa{myClients.length !== 1 ? "s" : ""} registrada{myClients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/portal/alta-operacion" className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
          + Nueva operación
        </Link>
      </div>

      {myClients.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no has registrado ningún cliente.</p>
          <p className="text-xs text-gray-300 mt-1">Los clientes se crean al dar de alta una operación.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Empresa</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contactos</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Operaciones</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myClients.map((client) => {
                const nContacts = contactCountByClient[client.id] ?? 0;
                const clientOps = opsByClient[client.id] ?? [];
                const nActivas = clientOps.filter((o) => o.status === "activa").length;
                const nPendientes = clientOps.filter((o) => o.status === "pendiente_de_validar").length;

                return (
                  <tr key={client.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/portal/clientes/${client.id}`} className="font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline transition-colors">
                        {client.nombre}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="hover:text-[#2E1A47] transition-colors">{client.email}</a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.telefono ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-4">
                      {nContacts > 0
                        ? <span className="text-sm text-gray-700">{nContacts} persona{nContacts !== 1 ? "s" : ""}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {nActivas > 0 && <span className="text-xs bg-[#EEEBF3] text-[#2E1A47] font-semibold px-2 py-0.5">{nActivas} activa{nActivas !== 1 ? "s" : ""}</span>}
                        {nPendientes > 0 && <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-2 py-0.5">{nPendientes} pdte.</span>}
                        {clientOps.length === 0 && <span className="text-xs text-gray-300">Sin ops.</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/portal/clientes/${client.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
