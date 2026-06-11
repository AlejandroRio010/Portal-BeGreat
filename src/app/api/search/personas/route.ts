import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, collaboratorContacts, clients, entityContacts, entityOfficeContacts, suppliers, collaborators } from "@/db/schema";
import { ilike, eq, and, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const pattern = `%${q}%`;

  const myClients = await db.select({ id: clients.id }).from(clients).where(eq(clients.collaborator_id, userId));
  const myClientIds = myClients.map(c => c.id);

  const results: Array<{ nombre: string; rol: string | null; email: string | null; telefono: string | null; linkedin?: string | null }> = [];

  if (myClientIds.length > 0) {
    const cc = await db
      .select({ nombre: contacts.nombre, rol: contacts.rol, email: contacts.email, telefono: contacts.telefono })
      .from(contacts)
      .where(and(inArray(contacts.client_id, myClientIds), ilike(contacts.nombre, pattern)))
      .limit(10);
    results.push(...cc);
  }

  const myContacts = await db.select({ nombre: collaboratorContacts.nombre, rol: collaboratorContacts.rol, email: collaboratorContacts.email, telefono: collaboratorContacts.telefono })
    .from(collaboratorContacts)
    .where(and(eq(collaboratorContacts.collaborator_id, userId), ilike(collaboratorContacts.nombre, pattern)))
    .limit(5);
  results.push(...myContacts);

  const [colab] = await db.select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);

  if ((colab?.nivel_entidades ?? 4) === 1) {
    const [ec, eoc] = await Promise.all([
      db.select({ nombre: entityContacts.nombre, rol: entityContacts.rol, email: entityContacts.email, telefono: entityContacts.telefono, linkedin: entityContacts.linkedin })
        .from(entityContacts).where(ilike(entityContacts.nombre, pattern)).limit(5),
      db.select({ nombre: entityOfficeContacts.nombre, rol: entityOfficeContacts.rol, email: entityOfficeContacts.email, telefono: entityOfficeContacts.telefono, linkedin: entityOfficeContacts.linkedin })
        .from(entityOfficeContacts).where(ilike(entityOfficeContacts.nombre, pattern)).limit(5),
    ]);
    results.push(...ec, ...eoc);
  }

  const mySuppliers = await db.select({ persona_contacto: suppliers.persona_contacto, contacto_email: suppliers.contacto_email, contacto_telefono: suppliers.contacto_telefono })
    .from(suppliers)
    .where(and(eq(suppliers.collaborator_id, userId), ilike(suppliers.persona_contacto, pattern)))
    .limit(5);
  for (const s of mySuppliers) {
    if (s.persona_contacto) {
      results.push({ nombre: s.persona_contacto, rol: null, email: s.contacto_email, telefono: s.contacto_telefono });
    }
  }

  const seen = new Set<string>();
  const unique = results.filter(p => {
    const key = p.nombre.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique.slice(0, 8));
}
