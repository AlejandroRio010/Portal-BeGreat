import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const body = await req.json();

  const { nombre, telefono, cif, web, num_trabajadores, razon_social, logo_url } = body;

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
