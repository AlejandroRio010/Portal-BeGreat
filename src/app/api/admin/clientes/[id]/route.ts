import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nombre, cif, email, telefono, web, linkedin, nombre_comercial, direccion, cnae, grupo_empresarial } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  await db.update(clients).set({
    nombre: nombre.trim(),
    cif: cif || null,
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    linkedin: linkedin || null,
    nombre_comercial: nombre_comercial || null,
    direccion: direccion || null,
    cnae: cnae || null,
    grupo_empresarial: grupo_empresarial || null,
  }).where(eq(clients.id, id));

  return NextResponse.json({ ok: true });
}
