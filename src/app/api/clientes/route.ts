import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, contacts } from "@/db/schema";
import { generateCodigoCLI } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collaboratorId = (session.user as any).collaboratorId as string;

  const body = await req.json();
  const {
    nombre, cif, email, telefono, web,
    direccion, provincia, cnae,
    contacto_nombre, contacto_email, contacto_telefono, contacto_puesto,
  } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const codigo = await generateCodigoCLI();

  const [client] = await db.insert(clients).values({
    collaborator_id: collaboratorId,
    nombre: nombre.trim(),
    cif: cif ? cif.replace(/^([A-Za-z])(?!-)(\d)/, "$1-$2").toUpperCase() : null,
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    direccion: direccion || null,
    provincia: provincia || null,
    cnae: cnae || null,
    codigo,
  }).returning();

  if (contacto_nombre?.trim()) {
    await db.insert(contacts).values({
      client_id: client.id,
      nombre: contacto_nombre.trim(),
      email: contacto_email || null,
      telefono: contacto_telefono || null,
      rol: contacto_puesto || null,
    });
  }

  return NextResponse.json(client, { status: 201 });
}
