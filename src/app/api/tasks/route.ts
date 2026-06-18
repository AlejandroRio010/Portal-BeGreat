import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationTasks, operations } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const isAdmin = role === "admin";
  let userId: string;
  if (isAdmin) {
    userId = (session.user as any).id;
  } else {
    userId = (session.user as any).collaboratorId;
  }
  if (!userId) return NextResponse.json([]);

  const tasks = await db
    .select({
      id: operationTasks.id,
      titulo: operationTasks.titulo,
      asignado_a: operationTasks.asignado_a,
      asignado_a_nombre: operationTasks.asignado_a_nombre,
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
        eq(operationTasks.completada, false),
        or(
          eq(operationTasks.asignado_a_id, userId),
          and(
            eq(operationTasks.asignado_a, "cliente"),
            isAdmin
              ? undefined
              : eq(operations.collaborator_id, userId)
          )
        )
      )
    )
    .orderBy(operationTasks.created_at);

  return NextResponse.json(tasks);
}
