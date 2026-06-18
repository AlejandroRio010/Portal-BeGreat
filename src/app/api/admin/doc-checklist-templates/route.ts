import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { docChecklistTemplates, docChecklistEntries } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.select().from(docChecklistTemplates).orderBy(asc(docChecklistTemplates.orden));
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nombre, tipo } = await req.json();
  if (!nombre) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });

  const [t] = await db.insert(docChecklistTemplates).values({
    nombre,
    tipo: tipo || "simple",
  }).returning();

  return NextResponse.json(t);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await db.delete(docChecklistEntries).where(eq(docChecklistEntries.template_id, id));
  await db.delete(docChecklistTemplates).where(eq(docChecklistTemplates.id, id));

  return NextResponse.json({ ok: true });
}
