import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactNotes, collaborators, contacts, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const role = (session.user as any).role;
  const userId = role === "admin" ? (session.user!.id as string) : ((session.user as any).collaboratorId as string);

  if (role !== "admin") {
    const [contact] = await db.select({ client_id: contacts.client_id }).from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    const [client] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, contact.client_id), eq(clients.collaborator_id, userId))).limit(1);
    if (!client) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authorName = role === "admin"
    ? ((session.user as any).nombre ?? session.user?.name ?? "Admin")
    : null;
  const [colab] = role !== "admin"
    ? await db.select({ nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, userId)).limit(1)
    : [{ nombre: authorName }];

  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

  const [note] = await db.insert(contactNotes).values({
    contact_id: contactId,
    author_id: userId,
    author_name: colab?.nombre ?? "Usuario",
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId, texto, pinned } = await req.json();
  if (!noteId) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [note] = await db.select().from(contactNotes).where(eq(contactNotes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (typeof texto === "string" && texto.trim()) {
    const userId = (session.user as any).role === "admin" ? (session.user!.id as string) : ((session.user as any).collaboratorId as string);
    if (note.author_id !== userId) return NextResponse.json({ error: "Solo puedes editar tus propias notas" }, { status: 403 });
    updateData.texto = texto.trim();
  }
  if (typeof pinned === "boolean") updateData.pinned = pinned;
  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  await db.update(contactNotes).set(updateData).where(eq(contactNotes.id, noteId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await req.json();
  const role = (session.user as any).role;
  if (role !== "admin") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await db.delete(contactNotes).where(eq(contactNotes.id, noteId));
  return NextResponse.json({ ok: true });
}
