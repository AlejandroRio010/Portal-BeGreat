import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaboratorContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  await db.delete(collaboratorContacts).where(eq(collaboratorContacts.id, contactId));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  const { nombre, rol, email, telefono } = await req.json();
  const upd: Record<string, unknown> = {};
  if (nombre !== undefined) upd.nombre = nombre?.trim() || null;
  if (rol !== undefined) upd.rol = rol || null;
  if (email !== undefined) upd.email = email || null;
  if (telefono !== undefined) upd.telefono = telefono || null;
  if (Object.keys(upd).length > 0) {
    await db.update(collaboratorContacts).set(upd).where(eq(collaboratorContacts.id, contactId));
  }
  return NextResponse.json({ ok: true });
}
