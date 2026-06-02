import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { customFieldValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { field_id, entity_id, valor } = body;
  if (!field_id || !entity_id) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // Upsert: check existing
  const [existing] = await db
    .select()
    .from(customFieldValues)
    .where(and(eq(customFieldValues.field_id, field_id), eq(customFieldValues.entity_id, entity_id)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(customFieldValues)
      .set({ valor: valor ?? null })
      .where(eq(customFieldValues.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db
      .insert(customFieldValues)
      .values({ field_id, entity_id, valor: valor ?? null })
      .returning();
    return NextResponse.json(created, { status: 201 });
  }
}
