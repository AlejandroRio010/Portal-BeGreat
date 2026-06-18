import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ilike } from "drizzle-orm";

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

  const results = await db.select(cols).from(suppliers).where(ilike(suppliers.nombre, `%${q}%`)).limit(8);

  return NextResponse.json(results);
}
