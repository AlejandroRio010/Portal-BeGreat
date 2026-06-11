import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { financialEntities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nombre, tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono, notas, nombre_oculto } = body;

  if (typeof nombre_oculto === "boolean" && Object.keys(body).length === 1) {
    await db.update(financialEntities).set({ nombre_oculto }).where(eq(financialEntities.id, id));
    return NextResponse.json({ ok: true });
  }

  if (!nombre?.trim() || !tipo) {
    return NextResponse.json({ error: "Nombre y tipo son obligatorios" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { nombre: nombre.trim(), tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono, notas };
  if (typeof nombre_oculto === "boolean") updateData.nombre_oculto = nombre_oculto;

  await db
    .update(financialEntities)
    .set(updateData)
    .where(eq(financialEntities.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(financialEntities).where(eq(financialEntities.id, id));
  return NextResponse.json({ ok: true });
}
