import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactNotes, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const userId = session.user!.id as string;

  const [colab] = await db.select({ nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);

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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await req.json();
  const role = (session.user as any).role;
  if (role !== "admin") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await db.delete(contactNotes).where(eq(contactNotes.id, noteId));
  return NextResponse.json({ ok: true });
}
