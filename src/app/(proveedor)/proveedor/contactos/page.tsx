import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, clients, operations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import ContactosListClient from "@/app/(admin)/admin/contactos/ContactosListClient";

export const dynamic = "force-dynamic";

interface ContactoUnificado {
  id: string;
  nombre: string;
  empresa: string;
  empresaId: string;
  puesto: string | null;
  email: string | null;
  telefono: string | null;
  linkedin: string | null;
  oficina: string | null;
  tipo: "cliente" | "entidad" | "proveedor";
  href: string;
}

export default async function ProveedorContactosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const supplierId = (session.user as any).supplierId as string;

  // Get client IDs from operations linked to this supplier
  const supplierOps = await db
    .select({ client_id: operations.client_id })
    .from(operations)
    .where(eq(operations.supplier_id, supplierId));

  const clientIds = [...new Set(supplierOps.map(o => o.client_id).filter(Boolean))] as string[];

  if (clientIds.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f7fb]">
        <div className="px-8 pt-8 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">Personas de contacto</h1>
          <p className="text-sm text-gray-400 mt-1">0 contactos registrados</p>
        </div>
        <div className="px-8">
          <div className="bg-white border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-sm">No hay contactos asociados a tus operaciones</p>
          </div>
        </div>
      </div>
    );
  }

  const myClients = await db.select({ id: clients.id, nombre: clients.nombre })
    .from(clients).where(inArray(clients.id, clientIds));

  const myClientIds = myClients.map(c => c.id);

  const clientContacts = myClientIds.length > 0
    ? await db.select({
        id: contacts.id,
        nombre: contacts.nombre,
        rol: contacts.rol,
        email: contacts.email,
        telefono: contacts.telefono,
        clientId: contacts.client_id,
      }).from(contacts).where(inArray(contacts.client_id, myClientIds))
    : [];

  const clientMap = new Map(myClients.map(c => [c.id, c.nombre]));

  const all: ContactoUnificado[] = [];

  for (const c of clientContacts) {
    all.push({
      id: c.id,
      nombre: c.nombre,
      empresa: clientMap.get(c.clientId) ?? "—",
      empresaId: c.clientId,
      puesto: c.rol,
      email: c.email,
      telefono: c.telefono,
      linkedin: null,
      oficina: null,
      tipo: "cliente",
      href: `/proveedor/clientes/${c.clientId}/contactos/${c.id}`,
    });
  }

  all.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="min-h-screen bg-[#f8f7fb]">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personas de contacto</h1>
        <p className="text-sm text-gray-400 mt-1">{all.length} contactos registrados</p>
      </div>
      <div className="px-8">
        <ContactosListClient contactos={all} role="colaborador" />
      </div>
    </div>
  );
}
