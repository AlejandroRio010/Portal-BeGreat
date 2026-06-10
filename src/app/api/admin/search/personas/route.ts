import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityContacts, entityOfficeContacts, contacts, collaboratorContacts, suppliers } from "@/db/schema";
import { ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const pattern = `%${q}%`;

  // Search across all contact tables
  const [ec, eoc, cl, cc] = await Promise.all([
    db.select({ nombre: entityContacts.nombre, rol: entityContacts.rol, email: entityContacts.email, telefono: entityContacts.telefono, linkedin: entityContacts.linkedin })
      .from(entityContacts).where(ilike(entityContacts.nombre, pattern)).limit(5),
    db.select({ nombre: entityOfficeContacts.nombre, rol: entityOfficeContacts.rol, email: entityOfficeContacts.email, telefono: entityOfficeContacts.telefono, linkedin: entityOfficeContacts.linkedin })
      .from(entityOfficeContacts).where(ilike(entityOfficeContacts.nombre, pattern)).limit(5),
    db.select({ nombre: contacts.nombre, rol: contacts.rol, email: contacts.email, telefono: contacts.telefono, linkedin: contacts.linkedin })
      .from(contacts).where(ilike(contacts.nombre, pattern)).limit(5),
    db.select({ nombre: collaboratorContacts.nombre, rol: collaboratorContacts.rol, email: collaboratorContacts.email, telefono: collaboratorContacts.telefono, linkedin: sql<string | null>`null` })
      .from(collaboratorContacts).where(ilike(collaboratorContacts.nombre, pattern)).limit(5),
  ]);

  const sup = await db.select({ persona_contacto: suppliers.persona_contacto, contacto_email: suppliers.contacto_email, contacto_telefono: suppliers.contacto_telefono })
    .from(suppliers).where(ilike(suppliers.persona_contacto, pattern)).limit(5);
  const supMapped = sup.filter(s => s.persona_contacto).map(s => ({
    nombre: s.persona_contacto!, rol: null as string | null, email: s.contacto_email, telefono: s.contacto_telefono, linkedin: null as string | null,
  }));

  // Merge and deduplicate by nombre
  const all = [...ec, ...eoc, ...cl, ...cc, ...supMapped];
  const seen = new Set<string>();
  const unique = all.filter(p => {
    const key = p.nombre.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique.slice(0, 8));
}
