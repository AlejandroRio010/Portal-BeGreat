import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import ClientesBuscador from "./ClientesBuscador";

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
        <ClientesBuscador clientes={myClients.map(c => ({
          id: c.id,
          nombre: c.nombre,
          cif: c.cif ?? null,
          email: c.email ?? null,
          web: c.web ?? null,
          codigo: c.codigo ?? null,
          ops_activas: (opsByClient[c.id] ?? []).filter(o => o.status === "activa").length,
          ops_totales: (opsByClient[c.id] ?? []).length,
        }))} />
      )}
    </div>
  );
}
