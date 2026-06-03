import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityOffices } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: entity_id } = await params;
  const body = await req.json();
  const { nombre, ciudad, direccion, email, telefono, persona_contacto, contacto_email, contacto_telefono, notas } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const [created] = await db.insert(entityOffices).values({
    entity_id, nombre: nombre.trim(), ciudad, direccion, email, telefono,
    persona_contacto, contacto_email, contacto_telefono, notas,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
