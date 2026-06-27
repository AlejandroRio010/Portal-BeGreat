import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { generateCodigoPRV } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "colaborador")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).collaboratorId as string;

  const { nombre, email, telefono, web, persona_contacto, contacto_email, contacto_telefono } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const codigo = await generateCodigoPRV();

  const [prov] = await db.insert(suppliers).values({
    collaborator_id: userId,
    nombre: nombre.trim(),
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    persona_contacto: persona_contacto || null,
    contacto_email: contacto_email || null,
    contacto_telefono: contacto_telefono || null,
    codigo,
  }).returning();

  return NextResponse.json(prov, { status: 201 });
}
