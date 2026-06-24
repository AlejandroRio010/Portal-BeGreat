import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operationTasks, operations, collaborators, suppliers } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendTaskReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueTasks = await db
    .select({
      id: operationTasks.id,
      titulo: operationTasks.titulo,
      operation_id: operationTasks.operation_id,
      asignado_a_id: operationTasks.asignado_a_id,
      asignado_a_nombre: operationTasks.asignado_a_nombre,
    })
    .from(operationTasks)
    .where(
      and(
        eq(operationTasks.completada, false),
        eq(operationTasks.recordatorio_enviado, false),
        lte(operationTasks.fecha_programada, now),
      )
    );

  if (dueTasks.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const grouped = new Map<string, { opId: string; assigneeId: string; assigneeName: string | null; tareas: string[] }>();
  for (const t of dueTasks) {
    if (!t.asignado_a_id) continue;
    const key = `${t.operation_id}:${t.asignado_a_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { opId: t.operation_id, assigneeId: t.asignado_a_id, assigneeName: t.asignado_a_nombre, tareas: [] });
    }
    grouped.get(key)!.tareas.push(t.titulo);
  }

  let sent = 0;
  for (const [, g] of grouped) {
    try {
      const [op] = await db.select({ nombre: operations.nombre }).from(operations).where(eq(operations.id, g.opId)).limit(1);
      if (!op) continue;

      let assignee: { email: string | null; nombre: string } | undefined;
      const [collab] = await db.select({ email: collaborators.email, nombre: collaborators.nombre }).from(collaborators).where(eq(collaborators.id, g.assigneeId)).limit(1);
      if (collab) assignee = collab;
      else {
        const [supplier] = await db.select({ email: suppliers.email, nombre: suppliers.nombre }).from(suppliers).where(eq(suppliers.id, g.assigneeId)).limit(1);
        if (supplier) assignee = supplier;
      }
      if (!assignee?.email) continue;

      await sendTaskReminderEmail(
        assignee.email,
        assignee.nombre,
        op.nombre ?? "Operación",
        g.opId,
        g.tareas,
        "BeGreat Consulting",
      );
      sent++;
    } catch (e: any) {
      console.error("[TaskReminderCron]", e.message);
    }
  }

  const taskIds = dueTasks.filter(t => t.asignado_a_id).map(t => t.id);
  if (taskIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    await db.update(operationTasks).set({ recordatorio_enviado: true }).where(inArray(operationTasks.id, taskIds));
  }

  return NextResponse.json({ sent, tasks: dueTasks.length });
}
