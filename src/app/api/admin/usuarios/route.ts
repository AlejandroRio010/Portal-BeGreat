import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, collaboratorUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateCodigoUsuario } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nombre, email, password, role, tipo_colaborador, nombre_comercial, razon_social, cif, telefono, web } = await req.json();

  if (!nombre?.trim() || !email?.trim() || !password || !role) {
    return NextResponse.json({ error: "Nombre, email, contraseña y rol son obligatorios" }, { status: 400 });
  }
  if (!["admin", "colaborador"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const emailNorm = email.toLowerCase().trim();

  // Check email uniqueness across both tables
  const [existingColab] = await db
    .select({ id: collaborators.id })
    .from(collaborators)
    .where(eq(collaborators.email, emailNorm))
    .limit(1);
  if (existingColab) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const [existingUser] = await db
    .select({ id: collaboratorUsers.id })
    .from(collaboratorUsers)
    .where(eq(collaboratorUsers.email, emailNorm))
    .limit(1);
  if (existingUser) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const codigo = await generateCodigoUsuario(role);
  const identificador = codigo;

  if (role === "admin") {
    // Admin: only create in collaborators table (no collaborator_users)
    const [newUser] = await db
      .insert(collaborators)
      .values({
        nombre: nombre.trim(),
        email: emailNorm,
        password_hash,
        role: "admin",
        identificador,
        codigo,
        activo: true,
      })
      .returning({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, identificador: collaborators.identificador, role: collaborators.role });

    return NextResponse.json(newUser, { status: 201 });
  }

  // Colaborador: create company (collaborators) + user (collaborator_users)
  const isAutonomo = tipo_colaborador === "autonomo";

  if (!isAutonomo && !razon_social?.trim()) {
    return NextResponse.json({ error: "La razón social es obligatoria para empresas" }, { status: 400 });
  }

  // nombre_comercial si existe, si no razón social, si no nombre de la persona
  const companyName = nombre_comercial?.trim() || razon_social?.trim() || nombre.trim();

  // Create collaborator (company)
  const [newColab] = await db
    .insert(collaborators)
    .values({
      nombre: companyName,
      email: emailNorm,
      password_hash: "migrated-to-collaborator-users",
      role: "colaborador",
      identificador,
      codigo,
      activo: true,
      razon_social: razon_social ?? null,
      cif: cif ?? null,
      telefono: telefono ?? null,
      web: web ?? null,
    })
    .returning({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, identificador: collaborators.identificador, role: collaborators.role });

  // Create first user for this company
  await db
    .insert(collaboratorUsers)
    .values({
      collaborator_id: newColab.id,
      nombre: nombre.trim(),
      email: emailNorm,
      password_hash,
      activo: true,
    });

  return NextResponse.json(newColab, { status: 201 });
}
