import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: entity_id } = await params;
  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto obligatorio" }, { status: 400 });
  const author_name = (session.user as any).nombre ?? session.user?.name ?? "Admin";
  const [note] = await db.insert(entityNotes).values({ entity_id, author_id: session.user!.id as string, author_name, texto: texto.trim() }).returning();
  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const [note] = await db.select().from(entityNotes).where(eq(entityNotes.id, id)).limit(1);
  if (!note) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (note.author_id !== (session.user!.id as string)) return NextResponse.json({ error: "Solo el autor puede editar" }, { status: 403 });
  const updates: Record<string, any> = {};
  if (body.texto !== undefined) updates.texto = body.texto.trim();
  if (body.pinned !== undefined) updates.pinned = body.pinned;
  if (Object.keys(updates).length === 0) return NextResponse.json(note);
  const [updated] = await db.update(entityNotes).set(updates).where(eq(entityNotes.id, id)).returning();
  return NextResponse.json(updated);
}
