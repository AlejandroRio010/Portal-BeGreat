import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateCodigoUsuario } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nombre, email, password, role, razon_social, cif, telefono, web } = await req.json();

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

  // Código según rol (admin → ADM-xxx, colaborador → COL-xxx). El identificador es el mismo código.
  const codigo = await generateCodigoUsuario(role);
  const identificador = codigo;

  const [newUser] = await db
    .insert(collaborators)
    .values({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      identificador,
      codigo,
      activo: true,
      razon_social: razon_social ?? null,
      cif: cif ?? null,
      telefono: telefono ?? null,
      web: web ?? null,
    })
    .returning({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, identificador: collaborators.identificador, role: collaborators.role });

  return NextResponse.json(newUser, { status: 201 });
}
