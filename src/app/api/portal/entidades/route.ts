import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { financialEntities, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const [colab] = await db
    .select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if ((colab?.nivel_entidades ?? 4) !== 1) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { nombre, tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono } = body;

  if (!nombre?.trim() || !tipo) {
    return NextResponse.json({ error: "Nombre y tipo son obligatorios" }, { status: 400 });
  }

  const [created] = await db
    .insert(financialEntities)
    .values({ nombre: nombre.trim(), tipo, email, telefono, web, linkedin, persona_contacto, contacto_email, contacto_telefono })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
