import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts } from "@/db/schema";
import { ilike, eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const role = (session.user as any).role;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const cols = { id: clients.id, nombre: clients.nombre, cif: clients.cif, email: clients.email, telefono: clients.telefono, web: clients.web, codigo: clients.codigo };

  const results = role === "admin"
    ? await db.select(cols).from(clients).where(ilike(clients.nombre, `%${q}%`)).limit(8)
    : await db.select(cols).from(clients).where(and(eq(clients.collaborator_id, userId), ilike(clients.nombre, `%${q}%`))).limit(8);

  // Adjuntar primera persona de contacto de cada cliente (para autorrelleno)
  const ids = results.map(r => r.id);
  const contactosMap = new Map<string, { nombre: string; email: string | null; telefono: string | null }>();
  if (ids.length > 0) {
    const cts = await db
      .select({ client_id: contacts.client_id, nombre: contacts.nombre, email: contacts.email, telefono: contacts.telefono })
      .from(contacts)
      .where(inArray(contacts.client_id, ids));
    for (const c of cts) {
      if (!contactosMap.has(c.client_id)) contactosMap.set(c.client_id, { nombre: c.nombre, email: c.email, telefono: c.telefono });
    }
  }

  const enriched = results.map(r => ({
    ...r,
    contacto_nombre: contactosMap.get(r.id)?.nombre ?? null,
    contacto_email: contactosMap.get(r.id)?.email ?? null,
    contacto_telefono: contactosMap.get(r.id)?.telefono ?? null,
  }));

  return NextResponse.json(enriched);
}
