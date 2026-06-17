import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationTasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getCallerInfo(session: any) {
  const role = (session.user as any).role;
  if (role === "admin") return { role: "admin" as const, id: (session.user as any).id as string };
  const collabId = (session.user as any).collaboratorId as string | undefined;
  if (collabId) return { role: "colaborador" as const, id: collabId };
  const supplierId = (session.user as any).supplierId as string | undefined;
  if (supplierId) return { role: "proveedor" as const, id: supplierId };
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const tasks = await db
    .select()
    .from(operationTasks)
    .where(eq(operationTasks.operation_id, id))
    .orderBy(operationTasks.created_at);

  return NextResponse.json(tasks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const caller = await getCallerInfo(session);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { titulo, asignado_a_id, asignado_a_nombre } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título obligatorio" }, { status: 400 });

  const [task] = await db.insert(operationTasks).values({
    operation_id: id,
    titulo: titulo.trim(),
    asignado_a: caller.role === "admin" ? "admin" : "colaborador",
    asignado_a_id: asignado_a_id || null,
    asignado_a_nombre: asignado_a_nombre || null,
    created_by_role: caller.role,
    created_by_id: caller.id,
  }).returning();

  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { taskId, completada } = await req.json();

  const updateData: Record<string, unknown> = { completada };
  if (completada) updateData.completed_at = new Date();
  else updateData.completed_at = null;

  await db.update(operationTasks).set(updateData).where(
    and(eq(operationTasks.id, taskId), eq(operationTasks.operation_id, id))
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { taskId } = await req.json();
  await db.delete(operationTasks).where(
    and(eq(operationTasks.id, taskId), eq(operationTasks.operation_id, id))
  );

  return NextResponse.json({ ok: true });
}
