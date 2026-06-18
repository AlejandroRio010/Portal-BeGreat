import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationTasks, operations } from "@/db/schema";
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

async function verifyOpAccess(opId: string, caller: { role: string; id: string }) {
  if (caller.role === "admin") return true;
  const field = caller.role === "colaborador" ? operations.collaborator_id : operations.supplier_id;
  const [op] = await db.select({ id: operations.id }).from(operations)
    .where(and(eq(operations.id, opId), eq(field, caller.id))).limit(1);
  return !!op;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const caller = await getCallerInfo(session);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await verifyOpAccess(id, caller)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (!await verifyOpAccess(id, caller)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { titulo, asignado_a_id, asignado_a_nombre } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título obligatorio" }, { status: 400 });

  const isCliente = asignado_a_id === "__cliente__";
  const isAvalista = asignado_a_id === "__avalista__";
  const asignado_a_role = isCliente ? "cliente" : isAvalista ? "avalista" : (caller.role === "admin" ? "admin" : "colaborador");
  const [task] = await db.insert(operationTasks).values({
    operation_id: id,
    titulo: titulo.trim(),
    asignado_a: asignado_a_role,
    asignado_a_id: (isCliente || isAvalista) ? null : (asignado_a_id || null),
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
  const caller = await getCallerInfo(session);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await verifyOpAccess(id, caller)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const caller = await getCallerInfo(session);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await verifyOpAccess(id, caller)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { taskId } = await req.json();
  await db.delete(operationTasks).where(
    and(eq(operationTasks.id, taskId), eq(operationTasks.operation_id, id))
  );

  return NextResponse.json({ ok: true });
}
