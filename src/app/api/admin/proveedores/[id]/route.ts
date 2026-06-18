import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nombre, email, telefono, web, persona_contacto, contacto_email, contacto_telefono, portal_activo, puede_ver_entidades, cif, cnae, direccion, provincia, nombre_comercial, collaborator_id } = body;

  // Single-field updates
  if (collaborator_id !== undefined && Object.keys(body).length === 1) {
    await db.update(suppliers).set({ collaborator_id: collaborator_id || null }).where(eq(suppliers.id, id));
    return NextResponse.json({ ok: true });
  }
  if (portal_activo !== undefined || puede_ver_entidades !== undefined) {
    const set: Record<string, any> = {};
    if (portal_activo !== undefined) set.portal_activo = portal_activo;
    if (puede_ver_entidades !== undefined) set.puede_ver_entidades = puede_ver_entidades;
    await db.update(suppliers).set(set).where(eq(suppliers.id, id));
    return NextResponse.json({ ok: true });
  }

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(suppliers).set({
    nombre: nombre.trim(),
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    cif: cif || null,
    cnae: cnae || null,
    direccion: direccion || null,
    provincia: provincia || null,
    nombre_comercial: nombre_comercial || null,
    persona_contacto: persona_contacto || null,
    contacto_email: contacto_email || null,
    contacto_telefono: contacto_telefono || null,
  }).where(eq(suppliers.id, id));

  return NextResponse.json({ ok: true });
}
