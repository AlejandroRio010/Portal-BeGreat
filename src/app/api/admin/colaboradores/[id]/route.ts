import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { nombre, email } = await req.json();

  if (!nombre || !email) {
    return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
  }

  // Check email uniqueness (exclude current user)
  const [existing] = await db
    .select({ id: collaborators.id })
    .from(collaborators)
    .where(eq(collaborators.email, email))
    .limit(1);

  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "Ese email ya está en uso por otro colaborador" }, { status: 409 });
  }

  await db
    .update(collaborators)
    .set({ nombre, email })
    .where(eq(collaborators.id, id));

  return NextResponse.json({ ok: true });
}
