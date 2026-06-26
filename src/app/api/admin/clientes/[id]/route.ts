import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, clientGroups, operations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDocId } from "@/lib/format";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nombre, cif, email, telefono, web, linkedin, nombre_comercial, direccion, cnae, group_id, collaborator_id } = body;

  if (collaborator_id !== undefined) {
    await db.update(clients).set({ collaborator_id }).where(eq(clients.id, id));
    if (Object.keys(body).length === 1) return NextResponse.json({ ok: true });
  }

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  // Derivar nombre del grupo desde group_id
  let grupoNombre: string | null = null;
  if (group_id) {
    const [g] = await db.select({ nombre: clientGroups.nombre }).from(clientGroups).where(eq(clientGroups.id, group_id)).limit(1);
    grupoNombre = g?.nombre ?? null;
  }

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
    group_id: group_id || null,
    grupo_empresarial: grupoNombre,
  }).where(eq(clients.id, id));

  // Re-generar nombres de operaciones con el nuevo nombre comercial / razón social
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
