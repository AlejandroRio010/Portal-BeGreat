import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nombre, email, password, role } = await req.json();

  if (!nombre?.trim() || !email?.trim() || !password || !role) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }
  if (!["admin", "colaborador"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  // Check uniqueness
  const [existing] = await db
    .select({ id: collaborators.id })
    .from(collaborators)
    .where(eq(collaborators.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Generate unique identificador
  const base = nombre.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const identificador = `${base}-${rand}`;

  const [newUser] = await db
    .insert(collaborators)
    .values({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      identificador,
      activo: true,
    })
    .returning({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, identificador: collaborators.identificador, role: collaborators.role });

  return NextResponse.json(newUser, { status: 201 });
}
