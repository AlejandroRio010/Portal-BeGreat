import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { id: grupoId } = await params;
  const { client_id } = await req.json();

  // El cliente debe pertenecer a este colaborador
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, client_id), eq(clients.collaborator_id, userId)))
    .limit(1);

  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  await db.update(clients).set({ group_id: grupoId }).where(eq(clients.id, client_id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { client_id } = await req.json();

  // Solo puede quitar sus propios clientes
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, client_id), eq(clients.collaborator_id, userId)))
    .limit(1);

  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  await db.update(clients).set({ group_id: null }).where(eq(clients.id, client_id));
  return NextResponse.json({ ok: true });
}
