import { db } from "@/db";
import { contacts, clients, entityContacts, entityOfficeContacts, financialEntities, entityOffices, suppliers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import ContactosListClient from "./ContactosListClient";

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
  tipo: "cliente" | "entidad" | "proveedor";
  href: string;
}

export default async function AdminContactosPage() {
  const [clientContacts, entContacts, officeContacts, supplierRows] = await Promise.all([
    db.select({
      id: contacts.id,
      nombre: contacts.nombre,
      rol: contacts.rol,
      email: contacts.email,
      telefono: contacts.telefono,
      linkedin: sql<string | null>`null`,
      clientId: clients.id,
      clientNombre: clients.nombre,
    }).from(contacts).leftJoin(clients, eq(contacts.client_id, clients.id)),

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
      officeId: entityOffices.id,
      entityId: financialEntities.id,
      entityNombre: financialEntities.nombre,
    }).from(entityOfficeContacts)
      .leftJoin(entityOffices, eq(entityOfficeContacts.office_id, entityOffices.id))
      .leftJoin(financialEntities, eq(entityOffices.entity_id, financialEntities.id)),

    db.select({
      id: suppliers.id,
      nombre: suppliers.nombre,
      persona_contacto: suppliers.persona_contacto,
      contacto_email: suppliers.contacto_email,
      contacto_telefono: suppliers.contacto_telefono,
    }).from(suppliers),
  ]);

  const all: ContactoUnificado[] = [];

  for (const c of clientContacts) {
    all.push({
      id: c.id,
      nombre: c.nombre,
      empresa: c.clientNombre ?? "—",
      empresaId: c.clientId ?? "",
      puesto: c.rol,
      email: c.email,
      telefono: c.telefono,
      linkedin: c.linkedin,
      tipo: "cliente",
      href: `/admin/clientes/${c.clientId}/contactos/${c.id}`,
    });
  }

  for (const c of entContacts) {
    all.push({
      id: c.id,
      nombre: c.nombre,
      empresa: c.entityNombre ?? "—",
      empresaId: c.entityId ?? "",
      puesto: c.rol,
      email: c.email,
      telefono: c.telefono,
      linkedin: c.linkedin,
      tipo: "entidad",
      href: `/admin/entidades/${c.entityId}/contactos/${c.id}`,
    });
  }

  for (const c of officeContacts) {
    all.push({
      id: c.id,
      nombre: c.nombre,
      empresa: c.entityNombre ?? "—",
      empresaId: c.entityId ?? "",
      puesto: c.rol,
      email: c.email,
      telefono: c.telefono,
      linkedin: c.linkedin,
      tipo: "entidad",
      href: `/admin/entidades/${c.entityId}/contactos/office-${c.id}`,
    });
  }

  for (const s of supplierRows) {
    if (!s.persona_contacto) continue;
    all.push({
      id: `sup-${s.id}`,
      nombre: s.persona_contacto,
      empresa: s.nombre,
      empresaId: s.id,
      puesto: null,
      email: s.contacto_email,
      telefono: s.contacto_telefono,
      linkedin: null,
      tipo: "proveedor",
      href: `/admin/proveedores/${s.id}`,
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
        <ContactosListClient contactos={all} role="admin" />
      </div>
    </div>
  );
}
