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

  const author_name = (session.user as any).nombre ?? session.user?.name ?? "Usuario";
  const [note] = await db.insert(clientNotes).values({
    client_id,
    author_id: session.user!.id as string,
    author_name,
    texto: texto.trim(),
  }).returning();

  return NextResponse.json(note, { status: 201 });
}
