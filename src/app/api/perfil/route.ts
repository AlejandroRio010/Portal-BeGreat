import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "colaborador")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).collaboratorId as string;
  const body = await req.json();

  const { nombre_comercial, telefono, cif, web, num_trabajadores, razon_social, logo_url } = body;

  // nombre = nombre_comercial si existe, si no razón social
  const nombre = nombre_comercial?.trim() || razon_social?.trim() || undefined;

  await db
    .update(collaborators)
    .set({
      nombre: nombre || undefined,
      telefono: telefono || undefined,
      cif: cif || undefined,
      web: web || undefined,
      num_trabajadores: num_trabajadores ? parseInt(num_trabajadores) : undefined,
      razon_social: razon_social || undefined,
      logo_url: logo_url || undefined,
    })
    .where(eq(collaborators.id, userId));

  return NextResponse.json({ ok: true });
}
