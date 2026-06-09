import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const userId = session.user!.id as string;
  const role = (session.user as any).role;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const textMatch = or(
    ilike(operations.nombre, `%${q}%`),
    ilike(clients.nombre, `%${q}%`),
    ilike(operations.codigo, `%${q}%`),
  );
  // Admin busca en todas las operaciones; colaborador solo en las suyas
  const whereClause = role === "admin" ? textMatch : and(eq(operations.collaborator_id, userId), textMatch);

  const results = await db
    .select({
      id: operations.id,
      codigo: operations.codigo,
      nombre: operations.nombre,
      pipeline_key: operations.pipeline_key,
      fase: operations.fase,
      fecha_cierre: operations.fecha_cierre,
      client_id: operations.client_id,
      client_nombre: clients.nombre,
      client_email: clients.email,
      client_telefono: clients.telefono,
      client_web: clients.web,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(whereClause)
    .orderBy(operations.created_at)
    .limit(10);

  return NextResponse.json(results);
}
