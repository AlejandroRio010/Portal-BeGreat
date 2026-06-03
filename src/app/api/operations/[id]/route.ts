import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { id } = await params;

  // Verify the op belongs to this collaborator
  const [op] = await db
    .select({ id: operations.id })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Check permission
  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  const { producto, importe, descripcion, plazo_meses, lugar_entrega, equipo_tipo } = body;

  await db.update(operations).set({
    producto: producto ?? null,
    importe: importe ?? null,
    descripcion: descripcion ?? null,
    plazo_meses: plazo_meses ? Number(plazo_meses) : null,
    lugar_entrega: lugar_entrega ?? null,
    equipo_tipo: equipo_tipo ?? null,
    updated_at: new Date(),
  }).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
