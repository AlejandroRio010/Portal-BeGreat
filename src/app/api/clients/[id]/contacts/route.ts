import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacts, clients, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { id: clientId } = await params;

  // Verify client belongs to this collaborator
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.collaborator_id, userId)))
    .limit(1);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Check permission
  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { nombre, rol, email, telefono, linkedin } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const [created] = await db.insert(contacts).values({
    client_id: clientId,
    nombre: nombre.trim(),
    rol: rol || null,
    email: email || null,
    telefono: telefono || null,
    linkedin: linkedin || null,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
