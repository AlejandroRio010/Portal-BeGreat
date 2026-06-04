import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const results = await db
    .select({ id: clients.id, nombre: clients.nombre, cif: clients.cif, email: clients.email, telefono: clients.telefono, web: clients.web, codigo: clients.codigo })
    .from(clients)
    .where(ilike(clients.nombre, `%${q}%`))
    .limit(8);

  return NextResponse.json(results);
}
