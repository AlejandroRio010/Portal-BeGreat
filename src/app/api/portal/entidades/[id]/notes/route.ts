import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityNotes, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getCollaborator(session: any) {
  const collaboratorId = (session.user as any).collaboratorId as string | undefined;
  if (!collaboratorId) return null;
  const [colab] = await db
    .select({ id: collaborators.id, nivel_entidades: collaborators.nivel_entidades, nombre: collaborators.nombre })
    .from(collaborators).where(eq(collaborators.id, collaboratorId)).limit(1);
  return colab;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const colab = await getCollaborator(session);
  if (!colab || (colab.nivel_entidades ?? 4) > 1) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id: entity_id } = await params;
  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto obligatorio" }, { status: 400 });

  const [note] = await db.insert(entityNotes).values({
    entity_id,
    author_id: colab.id,
    author_name: colab.nombre ?? "Colaborador",
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const colab = await getCollaborator(session);
  if (!colab || (colab.nivel_entidades ?? 4) > 1) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  await params;
  const { noteId, texto, pinned } = await req.json();
  if (!noteId) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [note] = await db.select().from(entityNotes).where(eq(entityNotes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (note.author_id !== colab.id) return NextResponse.json({ error: "Solo el autor puede editar" }, { status: 403 });

  const updates: Record<string, any> = {};
  if (texto !== undefined) updates.texto = texto.trim();
  if (pinned !== undefined) updates.pinned = pinned;
  if (Object.keys(updates).length === 0) return NextResponse.json(note);

  const [updated] = await db.update(entityNotes).set(updates).where(eq(entityNotes.id, noteId)).returning();
  return NextResponse.json(updated);
}
