import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ilike, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const role = (session.user as any).role;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const cols = {
    id: suppliers.id, nombre: suppliers.nombre, email: suppliers.email,
    telefono: suppliers.telefono, web: suppliers.web,
    persona_contacto: suppliers.persona_contacto,
    contacto_email: suppliers.contacto_email, contacto_telefono: suppliers.contacto_telefono,
    codigo: suppliers.codigo,
  };

  // Admin ve todos; colaborador solo los suyos
  const results = role === "admin"
    ? await db.select(cols).from(suppliers).where(ilike(suppliers.nombre, `%${q}%`)).limit(8)
    : await db.select(cols).from(suppliers).where(and(eq(suppliers.collaborator_id, userId), ilike(suppliers.nombre, `%${q}%`))).limit(8);

  return NextResponse.json(results);
}
