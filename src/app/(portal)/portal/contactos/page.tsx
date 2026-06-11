import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, clients, entityContacts, entityOfficeContacts, financialEntities, entityOffices, suppliers, collaborators } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
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

export default async function PortalContactosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = (session.user as any).collaboratorId as string;

  const [colab] = await db.select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  const nivelEntidades = colab?.nivel_entidades ?? 4;

  const myClients = await db.select({ id: clients.id, nombre: clients.nombre })
    .from(clients).where(eq(clients.collaborator_id, userId));
  const myClientIds = myClients.map(c => c.id);

  const mySuppliers = await db.select({
    id: suppliers.id,
    nombre: suppliers.nombre,
    persona_contacto: suppliers.persona_contacto,
    contacto_email: suppliers.contacto_email,
    contacto_telefono: suppliers.contacto_telefono,
  }).from(suppliers).where(eq(suppliers.collaborator_id, userId));

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
      href: `/portal/clientes/${c.clientId}/contactos/${c.id}`,
    });
  }

  if (nivelEntidades === 1) {
    const [entContacts, officeContacts] = await Promise.all([
      db.select({
        id: entityContacts.id,
        nombre: entityContacts.nombre,
        rol: entityContacts.rol,
        email: entityContacts.email,
        telefono: entityContacts.telefono,
        linkedin: entityContacts.linkedin,
        entityId: financialEntities.id,
        entityNombre: financialEntities.nombre,
      }).from(entityContacts).leftJoin(financialEntities, eq(entityContacts.entity_id, financialEntities.id)),

      db.select({
        id: entityOfficeContacts.id,
        nombre: entityOfficeContacts.nombre,
        rol: entityOfficeContacts.rol,
        email: entityOfficeContacts.email,
        telefono: entityOfficeContacts.telefono,
        linkedin: entityOfficeContacts.linkedin,
        entityId: financialEntities.id,
        entityNombre: financialEntities.nombre,
        officeNombre: entityOffices.nombre,
        officeCiudad: entityOffices.ciudad,
      }).from(entityOfficeContacts)
        .leftJoin(entityOffices, eq(entityOfficeContacts.office_id, entityOffices.id))
        .leftJoin(financialEntities, eq(entityOffices.entity_id, financialEntities.id)),
    ]);

    for (const c of entContacts) {
      all.push({
        id: c.id, nombre: c.nombre, empresa: c.entityNombre ?? "—", empresaId: c.entityId ?? "",
        puesto: c.rol, email: c.email, telefono: c.telefono, linkedin: c.linkedin,
        oficina: null,
        tipo: "entidad", href: `/portal/entidades/${c.entityId}/contactos/${c.id}`,
      });
    }
    for (const c of officeContacts) {
      const ofi = [c.officeNombre, c.officeCiudad].filter(Boolean).join(" — ");
      all.push({
        id: c.id, nombre: c.nombre, empresa: c.entityNombre ?? "—", empresaId: c.entityId ?? "",
        puesto: c.rol, email: c.email, telefono: c.telefono, linkedin: c.linkedin,
        oficina: ofi || null,
        tipo: "entidad", href: `/portal/entidades/${c.entityId}/office-contactos/${c.id}`,
      });
    }
  }

  for (const s of mySuppliers) {
    if (!s.persona_contacto) continue;
    all.push({
      id: `sup-${s.id}`, nombre: s.persona_contacto, empresa: s.nombre, empresaId: s.id,
      puesto: null, email: s.contacto_email, telefono: s.contacto_telefono, linkedin: null,
      oficina: null,
      tipo: "proveedor", href: `/portal/proveedores/${s.id}`,
    });
  }

  all.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const tabs = nivelEntidades === 1
    ? undefined
    : (["todos", "cliente", "proveedor"] as const);

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
