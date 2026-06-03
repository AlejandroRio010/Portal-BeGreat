import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { id } = await params;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.collaborator_id, userId)))
    .limit(1);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const { nombre, cif, email, telefono, web, linkedin } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(clients).set({
    nombre: nombre.trim(),
    cif: cif || null,
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    linkedin: linkedin || null,
  }).where(eq(clients.id, id));

  return NextResponse.json({ ok: true });
}
