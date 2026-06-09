import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroupContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ contactoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { contactoId } = await params;
  await db.delete(clientGroupContacts).where(eq(clientGroupContacts.id, contactoId));
  return NextResponse.json({ ok: true });
}
