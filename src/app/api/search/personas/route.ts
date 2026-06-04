import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, collaboratorContacts, clients } from "@/db/schema";
import { ilike, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const pattern = `%${q}%`;

  // Get only client IDs belonging to this collaborator
  const myClients = await db.select({ id: clients.id }).from(clients).where(eq(clients.collaborator_id, userId));
  const myClientIds = myClients.map(c => c.id);

  const results: Array<{ nombre: string; rol: string | null; email: string | null; telefono: string | null }> = [];

  // Contacts from my clients
  if (myClientIds.length > 0) {
    for (const clientId of myClientIds) {
      const cc = await db.select({ nombre: contacts.nombre, rol: contacts.rol, email: contacts.email, telefono: contacts.telefono })
        .from(contacts)
        .where(and(eq(contacts.client_id, clientId), ilike(contacts.nombre, pattern)))
        .limit(5);
      results.push(...cc);
    }
  }

  // My own collaborator contacts
  const myContacts = await db.select({ nombre: collaboratorContacts.nombre, rol: collaboratorContacts.rol, email: collaboratorContacts.email, telefono: collaboratorContacts.telefono })
    .from(collaboratorContacts)
    .where(and(eq(collaboratorContacts.collaborator_id, userId), ilike(collaboratorContacts.nombre, pattern)))
    .limit(5);
  results.push(...myContacts);

  // Deduplicate
  const seen = new Set<string>();
  const unique = results.filter(p => {
    const key = p.nombre.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique.slice(0, 8));
}
