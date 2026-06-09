import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageEntidades } from "@/lib/entidadesAuth";
import { db } from "@/db";
import { entityOfficeContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!(await canManageEntidades(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { contactId } = await params;
  await db.delete(entityOfficeContacts).where(eq(entityOfficeContacts.id, contactId));
  return NextResponse.json({ ok: true });
}
