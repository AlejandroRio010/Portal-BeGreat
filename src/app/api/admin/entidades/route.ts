import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { financialEntities } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { nombre, tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono, notas } = body;

  if (!nombre?.trim() || !tipo) {
    return NextResponse.json({ error: "Nombre y tipo son obligatorios" }, { status: 400 });
  }

  const [created] = await db
    .insert(financialEntities)
    .values({ nombre: nombre.trim(), tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono, notas })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
