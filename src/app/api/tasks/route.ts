import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationTasks, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  let assigneeFilter: "admin" | "colaborador";

  if (role === "admin") {
    assigneeFilter = "admin";
  } else {
    assigneeFilter = "colaborador";
  }

  const tasks = await db
    .select({
      id: operationTasks.id,
      titulo: operationTasks.titulo,
      asignado_a: operationTasks.asignado_a,
      completada: operationTasks.completada,
      created_at: operationTasks.created_at,
      operation_id: operationTasks.operation_id,
      op_nombre: operations.nombre,
      op_codigo: operations.codigo,
    })
    .from(operationTasks)
    .innerJoin(operations, eq(operationTasks.operation_id, operations.id))
    .where(
      and(
        eq(operationTasks.asignado_a, assigneeFilter),
        eq(operationTasks.completada, false)
      )
    )
    .orderBy(operationTasks.created_at);

  return NextResponse.json(tasks);
}
