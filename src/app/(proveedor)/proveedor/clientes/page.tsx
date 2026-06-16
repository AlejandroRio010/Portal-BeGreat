import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts, operations } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import ClientesTabla from "@/components/ClientesTabla";
import { NuevoClienteToggle } from "./NuevoClientePortal";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await auth();
  const userId = (session!.user as any).supplierId as string;

  // Get clients through operations belonging to this supplier
  const supplierOps = await db
    .select({ client_id: operations.client_id, status: operations.status })
    .from(operations)
    .where(eq(operations.supplier_id, userId));

  const uniqueClientIds = [...new Set(supplierOps.map(o => o.client_id).filter(Boolean))] as string[];

  const myClients = uniqueClientIds.length > 0
    ? await db.select().from(clients).where(inArray(clients.id, uniqueClientIds)).orderBy(clients.nombre)
    : [];

  const clientIds = myClients.map((c) => c.id);

  const allContacts = clientIds.length > 0
    ? await db.select().from(contacts).where(inArray(contacts.client_id, clientIds))
    : [];

  const contactCountByClient = allContacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.client_id] = (acc[c.client_id] ?? 0) + 1;
    return acc;
  }, {});

  const opsByClient = supplierOps.reduce<Record<string, typeof supplierOps>>((acc, o) => {
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
        <div className="flex gap-3">
          <NuevoClienteToggle />
          <Link href="/proveedor/alta-operacion" className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors">
            + Nueva operación
          </Link>
        </div>
      </div>

      {myClients.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no has registrado ningún cliente.</p>
          <p className="text-xs text-gray-300 mt-1">Los clientes se crean al dar de alta una operación.</p>
        </div>
      ) : (
        <ClientesTabla esAdmin={false} hrefBase="/proveedor/clientes" clientes={myClients.map(c => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo ?? null,
          cif: c.cif ?? null,
          email: c.email ?? null,
          ops: (opsByClient[c.id] ?? []).length,
        }))} />
      )}
    </div>
  );
}
