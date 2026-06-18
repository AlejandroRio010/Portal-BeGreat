import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { docChecklistCustomItems, docChecklistEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity_type, entity_id, nombre, tipo } = await req.json();
  if (!entity_type || !entity_id || !nombre)
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const [item] = await db.insert(docChecklistCustomItems).values({
    entity_type,
    entity_id,
    nombre,
    tipo: tipo || "simple",
  }).returning();

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await db.delete(docChecklistEntries).where(eq(docChecklistEntries.custom_item_id, id));
  await db.delete(docChecklistCustomItems).where(eq(docChecklistCustomItems.id, id));

  return NextResponse.json({ ok: true });
}
