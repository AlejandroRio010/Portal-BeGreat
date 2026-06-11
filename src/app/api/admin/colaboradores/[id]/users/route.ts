import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaboratorUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const users = await db
    .select({
      id: collaboratorUsers.id,
      nombre: collaboratorUsers.nombre,
      email: collaboratorUsers.email,
      activo: collaboratorUsers.activo,
      created_at: collaboratorUsers.created_at,
    })
    .from(collaboratorUsers)
    .where(eq(collaboratorUsers.collaborator_id, id))
    .orderBy(collaboratorUsers.created_at);

  return NextResponse.json(users);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collaboratorId } = await params;
  const { nombre, email } = await req.json();

  if (!nombre || !email) {
    return NextResponse.json({ error: "Nombre y email requeridos" }, { status: 400 });
  }

  const emailNorm = email.toLowerCase().trim();

  // Generate a random temporary password (user will set their own via access link)
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const password_hash = await bcrypt.hash(tempPassword, 12);

  try {
    const [user] = await db
      .insert(collaboratorUsers)
      .values({ collaborator_id: collaboratorId, nombre, email: emailNorm, password_hash })
      .returning({ id: collaboratorUsers.id, nombre: collaboratorUsers.nombre, email: collaboratorUsers.email, activo: collaboratorUsers.activo, created_at: collaboratorUsers.created_at });

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    if (e?.message?.includes("unique") || e?.code === "23505") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collaboratorId } = await params;
  const { userId, activo } = await req.json();

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  await db
    .update(collaboratorUsers)
    .set({ activo })
    .where(and(eq(collaboratorUsers.id, userId), eq(collaboratorUsers.collaborator_id, collaboratorId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collaboratorId } = await params;
  const { userId } = await req.json();

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  await db
    .delete(collaboratorUsers)
    .where(and(eq(collaboratorUsers.id, userId), eq(collaboratorUsers.collaborator_id, collaboratorId)));

  return NextResponse.json({ ok: true });
}
