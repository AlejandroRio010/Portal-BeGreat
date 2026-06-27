import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { officeContactNotes, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "proveedor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).collaboratorId as string;
  const [colab] = await db.select({ nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if (!colab) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto required" }, { status: 400 });

  const [note] = await db.insert(officeContactNotes).values({
    contact_id: contactId,
    author_id: userId,
    author_name: colab.nombre,
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "proveedor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { noteId, texto, pinned } = await req.json();
  if (!noteId) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [note] = await db.select().from(officeContactNotes).where(eq(officeContactNotes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (typeof texto === "string" && texto.trim()) {
    const userId = (session.user as any).collaboratorId as string;
    if (note.author_id !== userId) return NextResponse.json({ error: "Solo puedes editar tus propias notas" }, { status: 403 });
    updateData.texto = texto.trim();
  }
  if (typeof pinned === "boolean") updateData.pinned = pinned;
  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  await db.update(officeContactNotes).set(updateData).where(eq(officeContactNotes.id, noteId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const noteId = req.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await db.delete(officeContactNotes).where(and(eq(officeContactNotes.id, noteId), eq(officeContactNotes.contact_id, contactId)));
  return NextResponse.json({ ok: true });
}
