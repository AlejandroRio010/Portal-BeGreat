import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts } from "@/db/schema";
import { ilike, inArray, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const role = (session.user as any).role;
  const cols = { id: clients.id, nombre: clients.nombre, cif: clients.cif, email: clients.email, telefono: clients.telefono, web: clients.web, cnae: clients.cnae, codigo: clients.codigo };

  const where = role === "admin"
    ? ilike(clients.nombre, `%${q}%`)
    : and(ilike(clients.nombre, `%${q}%`), eq(clients.collaborator_id, (session.user as any).collaboratorId));

  const results = await db.select(cols).from(clients).where(where).limit(10);

  // Adjuntar primera persona de contacto de cada cliente (para autorrelleno)
  const ids = results.map(r => r.id);
  const contactosMap = new Map<string, { nombre: string; email: string | null; telefono: string | null; rol: string | null }>();
  if (ids.length > 0) {
    const cts = await db
      .select({ client_id: contacts.client_id, nombre: contacts.nombre, email: contacts.email, telefono: contacts.telefono, rol: contacts.rol })
      .from(contacts)
      .where(inArray(contacts.client_id, ids));
    for (const c of cts) {
      if (!contactosMap.has(c.client_id)) contactosMap.set(c.client_id, { nombre: c.nombre, email: c.email, telefono: c.telefono, rol: c.rol });
    }
  }

  const enriched = results.map(r => ({
    ...r,
    contacto_nombre: contactosMap.get(r.id)?.nombre ?? null,
    contacto_email: contactosMap.get(r.id)?.email ?? null,
    contacto_telefono: contactosMap.get(r.id)?.telefono ?? null,
    contacto_puesto: contactosMap.get(r.id)?.rol ?? null,
  }));

  return NextResponse.json(enriched);
}
