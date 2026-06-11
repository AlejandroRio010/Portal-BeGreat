import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaboratorContacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { nombre, email, telefono, rol } = await req.json();

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const [contact] = await db
    .insert(collaboratorContacts)
    .values({ collaborator_id: userId, nombre, email, telefono, rol })
    .returning();

  return NextResponse.json(contact, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const { id } = await req.json();

  await db
    .delete(collaboratorContacts)
    .where(and(eq(collaboratorContacts.id, id), eq(collaboratorContacts.collaborator_id, userId)));

  return NextResponse.json({ ok: true });
}
