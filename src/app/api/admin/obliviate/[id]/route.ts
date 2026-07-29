import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { obliviateMovs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CATEGORIAS_OBLIVIATE } from "@/lib/obliviate";

const VALIDAS = CATEGORIAS_OBLIVIATE.map(c => c.key);

// Cambiar a mano la categoría de un movimiento de Obliviate (cuando el
// automático la clasifica mal, p. ej. una transferencia a Bearing que en
// realidad paga una factura real y no es intragrupo).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { categoria } = await req.json();
  if (!VALIDAS.includes(categoria)) return NextResponse.json({ error: "Categoría no válida" }, { status: 400 });

  const [row] = await db.update(obliviateMovs).set({ categoria }).where(eq(obliviateMovs.id, id)).returning();
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
