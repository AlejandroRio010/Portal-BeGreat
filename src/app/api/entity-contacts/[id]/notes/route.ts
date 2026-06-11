import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityContactNotes, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const [colab] = await db.select({ nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if (!colab) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto required" }, { status: 400 });

  const [note] = await db.insert(entityContactNotes).values({
    contact_id: contactId,
    author_id: userId,
    author_name: colab.nombre,
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const noteId = req.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await db.delete(entityContactNotes).where(and(eq(entityContactNotes.id, noteId), eq(entityContactNotes.contact_id, contactId)));
  return NextResponse.json({ ok: true });
}
