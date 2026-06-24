import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationTasks, operations, collaborators, suppliers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTaskReminderEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { assigneeId } = await req.json();
  if (!assigneeId) return NextResponse.json({ error: "assigneeId required" }, { status: 400 });

  const [op] = await db.select({ nombre: operations.nombre }).from(operations).where(eq(operations.id, id)).limit(1);
  if (!op) return NextResponse.json({ error: "Op not found" }, { status: 404 });

  let assignee: { email: string | null; nombre: string } | undefined;
  const [collab] = await db.select({ email: collaborators.email, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, assigneeId)).limit(1);
  if (collab) {
    assignee = collab;
  } else {
    const [supplier] = await db.select({ email: suppliers.email, nombre: suppliers.nombre }).from(suppliers).where(eq(suppliers.id, assigneeId)).limit(1);
    if (supplier) assignee = supplier;
  }
  if (!assignee || !assignee.email) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });

  const pendingTasks = await db
    .select({ titulo: operationTasks.titulo })
    .from(operationTasks)
    .where(and(
      eq(operationTasks.operation_id, id),
      eq(operationTasks.asignado_a_id, assigneeId),
      eq(operationTasks.completada, false),
    ))
    .orderBy(operationTasks.created_at);

  if (pendingTasks.length === 0) return NextResponse.json({ error: "No pending tasks" }, { status: 400 });

  const senderName = (session.user as any).name || "BeGreat Consulting";

  await sendTaskReminderEmail(
    assignee.email!,
    assignee.nombre,
    op.nombre ?? "Operación",
    id,
    pendingTasks.map(t => t.titulo),
    senderName,
  );

  return NextResponse.json({ ok: true, sent: pendingTasks.length });
}
