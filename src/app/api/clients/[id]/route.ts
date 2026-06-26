import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, operations } from "@/db/schema";
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

  const displayName = (nombre_comercial?.trim() || nombre.trim());
  const clientOps = await db.select({ id: operations.id, nombre: operations.nombre, entidad_financiera: operations.entidad_financiera })
    .from(operations).where(eq(operations.client_id, id));
  for (const op of clientOps) {
    const opMatch = (op.nombre ?? "").match(/- OP (\d+)/);
    const opNum = opMatch ? opMatch[1] : null;
    if (!opNum) continue;
    const ent = op.entidad_financiera ? ` (${op.entidad_financiera})` : "";
    await db.update(operations).set({ nombre: `${displayName} - OP ${opNum}${ent}` }).where(eq(operations.id, op.id));
  }

  return NextResponse.json({ ok: true });
}
