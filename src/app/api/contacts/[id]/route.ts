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
  const { nombre, email, telefono, rol, linkedin } = body;
  const role = (session.user as any).role;

  const [contact] = await db.select({ client_id: contacts.client_id }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Admin can edit any contact; collaborator only their own clients
  if (role !== "admin") {
    const [client] = await db.select({ collaborator_id: clients.collaborator_id }).from(clients).where(eq(clients.id, contact.client_id)).limit(1);
    const collabId = (session.user as any).collaboratorId ?? session.user!.id;
    if (!client || client.collaborator_id !== collabId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.update(contacts).set({
    nombre: nombre?.trim() || undefined,
    email: email || null,
    telefono: telefono || null,
    rol: rol || null,
    linkedin: linkedin || null,
  }).where(eq(contacts.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;

  const [contact] = await db.select({ client_id: contacts.client_id }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "admin") {
    const [client] = await db.select({ collaborator_id: clients.collaborator_id }).from(clients).where(eq(clients.id, contact.client_id)).limit(1);
    const collabId = (session.user as any).collaboratorId ?? session.user!.id;
    if (!client || client.collaborator_id !== collabId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(contacts).where(eq(contacts.id, id));
  return NextResponse.json({ ok: true });
}
