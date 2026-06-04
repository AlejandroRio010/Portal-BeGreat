import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientNotes } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: client_id } = await params;
  const { texto } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: "Texto obligatorio" }, { status: 400 });
  const author_name = (session.user as any).nombre ?? session.user?.name ?? "Admin";
  const [note] = await db.insert(clientNotes).values({ client_id, author_id: session.user!.id as string, author_name, texto: texto.trim() }).returning();
  return NextResponse.json(note, { status: 201 });
}
