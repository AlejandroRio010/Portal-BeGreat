import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientDocuments, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user!.id as string;
  const role = (session.user as any).role;
  const nombre = (session.user as any).nombre ?? "Usuario";

  if (role !== "admin") {
    const [client] = await db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, id), eq(clients.collaborator_id, userId))).limit(1);
    if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { url, filename, size } = await req.json();
  if (!url || !filename) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const [doc] = await db.insert(clientDocuments).values({
    client_id: id,
    filename,
    url,
    size: size ?? null,
    uploaded_by: nombre,
  }).returning();

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await req.json();
  await db.delete(clientDocuments).where(eq(clientDocuments.id, docId));
  return NextResponse.json({ ok: true });
}
