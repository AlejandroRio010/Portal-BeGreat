import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nombre, email, telefono, cif, web, razon_social, num_trabajadores, activo,
          puede_editar_ops, puede_ver_entidades } = body;

  const updateData: Record<string, unknown> = {};

  // Permisos-only update (no nombre/email required)
  if (puede_editar_ops !== undefined) updateData.puede_editar_ops = puede_editar_ops;
  if (puede_ver_entidades !== undefined) updateData.puede_ver_entidades = puede_ver_entidades;

  // Full profile update
  if (nombre !== undefined) {
    if (!nombre || !email) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: collaborators.id })
      .from(collaborators)
      .where(eq(collaborators.email, email))
      .limit(1);

    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Ese email ya está en uso por otro colaborador" }, { status: 409 });
    }

    updateData.nombre = nombre;
    updateData.email = email;
    updateData.telefono = telefono ?? null;
    updateData.cif = cif ?? null;
    updateData.web = web ?? null;
    updateData.razon_social = razon_social ?? null;
    updateData.num_trabajadores = num_trabajadores ?? null;
    if (activo !== undefined) updateData.activo = activo;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  await db.update(collaborators).set(updateData).where(eq(collaborators.id, id));

  return NextResponse.json({ ok: true });
}
