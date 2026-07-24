import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ilike, and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const cols = {
    id: suppliers.id, nombre: suppliers.nombre, email: suppliers.email,
    telefono: suppliers.telefono, web: suppliers.web,
    persona_contacto: suppliers.persona_contacto,
    contacto_email: suppliers.contacto_email, contacto_telefono: suppliers.contacto_telefono,
    codigo: suppliers.codigo,
  };

  // El admin busca en todos; el colaborador solo en sus proveedores (no debe
  // ver los de otros — mismo criterio que /api/search/clientes).
  const role = (session.user as any).role;
  const where = role === "admin"
    ? ilike(suppliers.nombre, `%${q}%`)
    : and(ilike(suppliers.nombre, `%${q}%`), eq(suppliers.collaborator_id, (session.user as any).collaboratorId));

  const results = await db.select(cols).from(suppliers).where(where).limit(8);

  return NextResponse.json(results);
}
