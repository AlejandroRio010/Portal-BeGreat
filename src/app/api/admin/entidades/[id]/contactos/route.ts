import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageEntidades } from "@/lib/entidadesAuth";
import { db } from "@/db";
import { entityContacts } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await canManageEntidades(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: entity_id } = await params;
  const { nombre, rol, email, telefono, linkedin } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const [created] = await db.insert(entityContacts).values({
    entity_id, nombre: nombre.trim(), rol: rol || null,
    email: email || null, telefono: telefono || null, linkedin: linkedin || null,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
