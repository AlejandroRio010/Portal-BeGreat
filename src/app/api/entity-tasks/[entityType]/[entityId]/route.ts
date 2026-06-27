import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityTasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ entityType: string; entityId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId } = await params;
  const tasks = await db
    .select()
    .from(entityTasks)
    .where(and(eq(entityTasks.entity_type, entityType), eq(entityTasks.entity_id, entityId)))
    .orderBy(entityTasks.created_at);

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType, entityId } = await params;
  const { titulo, asignado_a_nombre } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título obligatorio" }, { status: 400 });

  const userId = ((session.user as any).collaboratorId ?? (session.user as any).supplierId ?? session.user!.id) as string;

  const [task] = await db.insert(entityTasks).values({
    entity_type: entityType,
    entity_id: entityId,
    titulo: titulo.trim(),
    asignado_a_nombre: asignado_a_nombre || null,
    created_by_id: userId,
  }).returning();

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, completada, fecha_programada } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requerido" }, { status: 400 });

  const role = (session.user as any).role;
  const userId = ((session.user as any).collaboratorId ?? (session.user as any).supplierId ?? session.user!.id) as string;
  const [task] = await db.select({ created_by_id: entityTasks.created_by_id }).from(entityTasks).where(eq(entityTasks.id, taskId)).limit(1);
  if (!task) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (role !== "admin" && task.created_by_id !== userId)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (typeof completada === "boolean") {
    update.completada = completada;
    update.completed_at = completada ? new Date() : null;
  }
  if (fecha_programada !== undefined) {
    update.fecha_programada = fecha_programada ? new Date(fecha_programada) : null;
  }

  await db.update(entityTasks).set(update).where(eq(entityTasks.id, taskId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requerido" }, { status: 400 });

  const role = (session.user as any).role;
  const userId = ((session.user as any).collaboratorId ?? (session.user as any).supplierId ?? session.user!.id) as string;
  const [task] = await db.select({ created_by_id: entityTasks.created_by_id }).from(entityTasks).where(eq(entityTasks.id, taskId)).limit(1);
  if (!task) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (role !== "admin" && task.created_by_id !== userId)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await db.delete(entityTasks).where(eq(entityTasks.id, taskId));
  return NextResponse.json({ ok: true });
}
