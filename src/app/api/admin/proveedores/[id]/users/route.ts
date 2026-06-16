import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { supplierUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const users = await db
    .select({
      id: supplierUsers.id,
      nombre: supplierUsers.nombre,
      email: supplierUsers.email,
      activo: supplierUsers.activo,
      created_at: supplierUsers.created_at,
    })
    .from(supplierUsers)
    .where(eq(supplierUsers.supplier_id, id))
    .orderBy(supplierUsers.created_at);

  return NextResponse.json(users);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: supplierId } = await params;
  const { nombre, email } = await req.json();

  if (!nombre || !email)
    return NextResponse.json({ error: "Nombre y email requeridos" }, { status: 400 });

  const emailNorm = email.toLowerCase().trim();
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const password_hash = await bcrypt.hash(tempPassword, 12);

  try {
    const [user] = await db
      .insert(supplierUsers)
      .values({ supplier_id: supplierId, nombre, email: emailNorm, password_hash })
      .returning({ id: supplierUsers.id, nombre: supplierUsers.nombre, email: supplierUsers.email, activo: supplierUsers.activo, created_at: supplierUsers.created_at });

    return NextResponse.json({ ...user, tempPassword }, { status: 201 });
  } catch (e: any) {
    if (e?.message?.includes("unique") || e?.code === "23505")
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: supplierId } = await params;
  const { userId, activo } = await req.json();

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  await db
    .update(supplierUsers)
    .set({ activo })
    .where(and(eq(supplierUsers.id, userId), eq(supplierUsers.supplier_id, supplierId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: supplierId } = await params;
  const { userId } = await req.json();

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  await db
    .delete(supplierUsers)
    .where(and(eq(supplierUsers.id, userId), eq(supplierUsers.supplier_id, supplierId)));

  return NextResponse.json({ ok: true });
}
