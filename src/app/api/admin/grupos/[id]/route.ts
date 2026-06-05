import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { nombre, descripcion, web, cif_matriz } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(clientGroups).set({
    nombre: nombre.trim(),
    descripcion: descripcion || null,
    web: web || null,
    cif_matriz: cif_matriz || null,
  }).where(eq(clientGroups.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Desvincular empresas del grupo antes de borrar
  await db.update(clients).set({ group_id: null, grupo_empresarial: null }).where(eq(clients.group_id, id));
  await db.delete(clientGroups).where(eq(clientGroups.id, id));
  return NextResponse.json({ ok: true });
}
