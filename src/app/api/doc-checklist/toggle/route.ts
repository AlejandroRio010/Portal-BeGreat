import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { docChecklistEntries } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity_type, entity_id, template_id, custom_item_id, year, quarter, checked } = await req.json();

  if (!entity_type || !entity_id || (!template_id && !custom_item_id))
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const conditions = [
    eq(docChecklistEntries.entity_type, entity_type),
    eq(docChecklistEntries.entity_id, entity_id),
  ];

  if (template_id) {
    conditions.push(eq(docChecklistEntries.template_id, template_id));
  } else {
    conditions.push(eq(docChecklistEntries.custom_item_id, custom_item_id));
  }

  if (year != null) {
    conditions.push(eq(docChecklistEntries.year, year));
  } else {
    conditions.push(isNull(docChecklistEntries.year));
  }

  if (quarter != null) {
    conditions.push(eq(docChecklistEntries.quarter, quarter));
  } else {
    conditions.push(isNull(docChecklistEntries.quarter));
  }

  const [existing] = await db.select({ id: docChecklistEntries.id }).from(docChecklistEntries).where(and(...conditions)).limit(1);

  if (existing) {
    await db.update(docChecklistEntries).set({ checked }).where(eq(docChecklistEntries.id, existing.id));
  } else {
    await db.insert(docChecklistEntries).values({
      entity_type,
      entity_id,
      template_id: template_id || null,
      custom_item_id: custom_item_id || null,
      year: year ?? null,
      quarter: quarter ?? null,
      checked,
    });
  }

  return NextResponse.json({ ok: true });
}
