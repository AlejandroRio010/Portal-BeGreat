import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { customFields } from "@/db/schema";
import { eq, max, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fields = await db
    .select()
    .from(customFields)
    .orderBy(asc(customFields.entidad), asc(customFields.orden));
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { etiqueta, entidad, tipo } = body;
  if (!etiqueta || !entidad || !tipo) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // Compute next orden for this entidad
  const [{ maxOrden }] = await db
    .select({ maxOrden: max(customFields.orden) })
    .from(customFields)
    .where(eq(customFields.entidad, entidad));

  const orden = (maxOrden ?? -1) + 1;

  const [field] = await db
    .insert(customFields)
    .values({ etiqueta, entidad, tipo, orden })
    .returning();

  return NextResponse.json(field, { status: 201 });
}
