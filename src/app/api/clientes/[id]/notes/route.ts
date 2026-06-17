import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientNotes, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const { id: client_id } = await params;
  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto obligatorio" }, { status: 400 });

  if (role !== "admin") {
    const collabId = (session.user as any).collaboratorId ?? session.user!.id;
    const [client] = await db.select({ collaborator_id: clients.collaborator_id }).from(clients).where(eq(clients.id, client_id)).limit(1);
    if (!client || client.collaborator_id !== collabId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const userId = ((session.user as any).collaboratorId ?? session.user!.id) as string;
  const author_name = (session.user as any).nombre ?? session.user?.name ?? "Usuario";
  const [note] = await db.insert(clientNotes).values({
    client_id,
    author_id: userId,
    author_name,
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = ((session.user as any).collaboratorId ?? session.user!.id) as string;
  const { noteId, texto, pinned } = await req.json();
  if (!noteId) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [note] = await db.select().from(clientNotes).where(eq(clientNotes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  if (note.author_id !== userId) {
    return NextResponse.json({ error: "Solo puedes editar tus propias notas" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof texto === "string" && texto.trim()) updateData.texto = texto.trim();
  if (typeof pinned === "boolean") updateData.pinned = pinned;
  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  await db.update(clientNotes).set(updateData).where(eq(clientNotes.id, noteId));
  return NextResponse.json({ ok: true });
}
