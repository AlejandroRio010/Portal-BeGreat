import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).collaboratorId as string;
  const { id } = await params;

  // El proveedor debe pertenecer al colaborador
  const [prov] = await db.select({ id: suppliers.id }).from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.collaborator_id, userId))).limit(1);
  if (!prov) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { nombre, email, telefono, web, persona_contacto, contacto_email, contacto_telefono } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(suppliers).set({
    nombre: nombre.trim(),
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    persona_contacto: persona_contacto || null,
    contacto_email: contacto_email || null,
    contacto_telefono: contacto_telefono || null,
  }).where(eq(suppliers.id, id));

  return NextResponse.json({ ok: true });
}
