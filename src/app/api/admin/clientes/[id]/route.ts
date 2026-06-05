import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, clientGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nombre, cif, email, telefono, web, linkedin, nombre_comercial, direccion, cnae, group_id } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  // Derivar nombre del grupo desde group_id
  let grupoNombre: string | null = null;
  if (group_id) {
    const [g] = await db.select({ nombre: clientGroups.nombre }).from(clientGroups).where(eq(clientGroups.id, group_id)).limit(1);
    grupoNombre = g?.nombre ?? null;
  }

  await db.update(clients).set({
    nombre: nombre.trim(),
    cif: cif || null,
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    linkedin: linkedin || null,
    nombre_comercial: nombre_comercial || null,
    direccion: direccion || null,
    cnae: cnae || null,
    group_id: group_id || null,
    grupo_empresarial: grupoNombre,
  }).where(eq(clients.id, id));

  return NextResponse.json({ ok: true });
}
