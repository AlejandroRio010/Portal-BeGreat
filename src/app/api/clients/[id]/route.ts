import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDocId } from "@/lib/format";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { id } = await params;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.collaborator_id, userId)))
    .limit(1);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { nombre, cif, email, telefono, web, linkedin, nombre_comercial, direccion, cnae } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  // El grupo empresarial lo gestiona el admin — no se toca aquí
  await db.update(clients).set({
    nombre: nombre.trim(),
    cif: cif ? formatDocId(cif) : null,
    email: email || null,
    telefono: telefono || null,
    web: web || null,
    linkedin: linkedin || null,
    nombre_comercial: nombre_comercial || null,
    direccion: direccion || null,
    cnae: cnae || null,
  }).where(eq(clients.id, id));

  return NextResponse.json({ ok: true });
}
