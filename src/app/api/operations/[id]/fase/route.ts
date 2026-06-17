import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendOperationValidatedEmail, sendOperationApprovedEmail } from "@/lib/email";
import { fmtEur } from "@/lib/format";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { id } = await params;

  const [op] = await db
    .select({
      id: operations.id,
      fecha_cierre: operations.fecha_cierre,
      status: operations.status,
      fase: operations.fase,
      nombre: operations.nombre,
      collaborator_id: operations.collaborator_id,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
    })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const [colab] = await db
    .select({ puede_editar_ops: collaborators.puede_editar_ops })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  if (!colab?.puede_editar_ops) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { fase } = await req.json();
  if (!fase) return NextResponse.json({ error: "Fase requerida" }, { status: 400 });

  const updateData: Record<string, unknown> = { fase, updated_at: new Date() };

  if (op.status === "pendiente_de_validar") {
    updateData.status = "activa";
  }

  if (FIRMADAS.includes(fase) && !op.fecha_cierre) {
    updateData.fecha_cierre = new Date();
  }

  await db.update(operations).set(updateData).where(eq(operations.id, id));

  (async () => {
    try {
      const [colabData] = await db
        .select({ email: collaborators.email, nombre: collaborators.nombre })
        .from(collaborators)
        .where(eq(collaborators.id, op.collaborator_id))
        .limit(1);
      if (!colabData) return;

      if (op.status === "pendiente_de_validar") {
        await sendOperationValidatedEmail(colabData.email, colabData.nombre, op.nombre ?? "Operación", id);
      }

      if (fase === "Operación aprobada" && op.fase !== "Operación aprobada") {
        await sendOperationApprovedEmail(
          colabData.email, colabData.nombre, op.nombre ?? "Operación", id,
          fmtEur(op.importe), fmtEur(op.comision_colaborador)
        );
      }
    } catch (e: any) {
      console.error("[OpEmail]", e.message);
    }
  })();

  return NextResponse.json({ ok: true });
}
