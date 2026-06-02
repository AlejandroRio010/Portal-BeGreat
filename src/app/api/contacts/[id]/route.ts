import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nombre, email, telefono, rol, linkedin, notas } = body;

  // Verify contact belongs to this collaborator's client
  const [contact] = await db.select({ client_id: contacts.client_id }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [client] = await db.select({ collaborator_id: clients.collaborator_id }).from(clients).where(eq(clients.id, contact.client_id)).limit(1);
  if (!client || client.collaborator_id !== session.user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.update(contacts).set({ nombre, email: email || null, telefono: telefono || null, rol: rol || null, linkedin: linkedin || null, notas: notas || null }).where(eq(contacts.id, id));

  return NextResponse.json({ ok: true });
}
