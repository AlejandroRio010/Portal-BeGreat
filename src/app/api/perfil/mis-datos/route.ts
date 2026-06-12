import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaboratorUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const { nombre } = await req.json();

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  await db
    .update(collaboratorUsers)
    .set({ nombre: nombre.trim() })
    .where(eq(collaboratorUsers.id, userId));

  return NextResponse.json({ ok: true });
}
