import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notes, operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const userRole = (session.user as any).role;

  // Verify the user has access to this operation
  if (userRole === "colaborador") {
    const [op] = await db
      .select({ id: operations.id })
      .from(operations)
      .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
      .limit(1);

    if (!op) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

  const [user] = await db
    .select({ nombre: collaborators.nombre })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const [note] = await db
    .insert(notes)
    .values({
      operation_id: id,
      author_id: userId,
      author_name: user?.nombre ?? "Usuario",
      texto: texto.trim(),
    })
    .returning();

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const userRole = (session.user as any).role;
  const { noteId, texto } = await req.json();
  if (!noteId || !texto?.trim()) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });

  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

  // Solo el autor o el admin pueden editar
  if (userRole !== "admin" && note.author_id !== userId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  await db.update(notes).set({ texto: texto.trim() }).where(eq(notes.id, noteId));
  return NextResponse.json({ ok: true });
}
