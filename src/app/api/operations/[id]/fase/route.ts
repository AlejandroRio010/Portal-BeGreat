import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { id } = await params;

  // La op debe pertenecer a este colaborador
  const [op] = await db
    .select({ id: operations.id, fecha_cierre: operations.fecha_cierre })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Permiso para editar operaciones
  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { fase } = await req.json();
  if (!fase) return NextResponse.json({ error: "Fase requerida" }, { status: 400 });

  const updateData: Record<string, unknown> = { fase, updated_at: new Date() };
  if (FIRMADAS.includes(fase) && !op.fecha_cierre) {
    updateData.fecha_cierre = new Date();
  }
  await db.update(operations).set(updateData).where(eq(operations.id, id));
  return NextResponse.json({ ok: true });
}
