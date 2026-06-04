import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityOfficeContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  const { notas } = await req.json();
  await db.update(entityOfficeContacts).set({ notas: notas ?? null }).where(eq(entityOfficeContacts.id, contactId));
  return NextResponse.json({ ok: true });
}
