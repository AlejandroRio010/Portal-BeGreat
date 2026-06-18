import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroups } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nombre, descripcion, web, cif_matriz } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0)` })
    .from(clientGroups)
    .where(sql`codigo LIKE 'GRP-%'`);
  const codigo = `GRP-${String((max ?? 0) + 1).padStart(3, "0")}`;

  const [grupo] = await db.insert(clientGroups).values({
    nombre: nombre.trim(),
    descripcion: descripcion || null,
    web: web || null,
    cif_matriz: cif_matriz || null,
    codigo,
  }).returning();

  return NextResponse.json(grupo, { status: 201 });
}
