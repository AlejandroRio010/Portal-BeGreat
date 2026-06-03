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
  const { nombre, email, telefono, web, persona_contacto, contacto_email, contacto_telefono } = body;
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
