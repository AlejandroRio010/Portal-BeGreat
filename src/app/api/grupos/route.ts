import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "admin" && role !== "colaborador") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { nombre, descripcion, web, cif_matriz } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0)` })
    .from(clientGroups)
    .where(sql`codigo LIKE 'GRP-%'`);
  const codigo = `GRP-${String((max ?? 0) + 1).padStart(3, "0")}`;

  // El grupo queda vinculado a su creador si es colaborador (así el modelo de
  // acceso —admin, grupo propio o con clientes dentro— lo reconoce como suyo).
  const collaboratorId = role === "colaborador" ? ((session.user as any).collaboratorId as string) : null;
  const [grupo] = await db.insert(clientGroups).values({
    nombre: nombre.trim(),
    descripcion: descripcion || null,
    web: web || null,
    cif_matriz: cif_matriz || null,
    codigo,
    collaborator_id: collaboratorId,
  }).returning();

  return NextResponse.json(grupo, { status: 201 });
}
