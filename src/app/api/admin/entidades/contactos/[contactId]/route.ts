import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageEntidades } from "@/lib/entidadesAuth";
import { db } from "@/db";
import { entityContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!(await canManageEntidades(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  await db.delete(entityContacts).where(eq(entityContacts.id, contactId));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!(await canManageEntidades(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  const { nombre, rol, email, telefono, linkedin } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(entityContacts).set({
    nombre: nombre.trim(), rol: rol || null,
    email: email || null, telefono: telefono || null, linkedin: linkedin || null,
  }).where(eq(entityContacts.id, contactId));

  return NextResponse.json({ ok: true });
}
