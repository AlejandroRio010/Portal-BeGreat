import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Asignar una empresa al grupo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { client_id } = await req.json();
  if (!client_id) return NextResponse.json({ error: "client_id requerido" }, { status: 400 });

  const [grupo] = await db.select({ nombre: clientGroups.nombre }).from(clientGroups).where(eq(clientGroups.id, id)).limit(1);
  if (!grupo) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

  await db.update(clients).set({ group_id: id, grupo_empresarial: grupo.nombre }).where(eq(clients.id, client_id));
  return NextResponse.json({ ok: true });
}

// Quitar una empresa del grupo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { client_id } = await req.json();
  if (!client_id) return NextResponse.json({ error: "client_id requerido" }, { status: 400 });

  await db.update(clients).set({ group_id: null, grupo_empresarial: null })
    .where(and(eq(clients.id, client_id), eq(clients.group_id, id)));
  return NextResponse.json({ ok: true });
}
