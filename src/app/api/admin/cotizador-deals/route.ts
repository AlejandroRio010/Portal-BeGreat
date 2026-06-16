import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cotizadorDeals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await db
    .select()
    .from(cotizadorDeals)
    .orderBy(cotizadorDeals.entidad, desc(cotizadorDeals.created_at));

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entidad, cliente, importe, cuota, plazo_meses } = await req.json();
  if (!entidad || !cliente?.trim() || !importe || !cuota || !plazo_meses)
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });

  const [deal] = await db.insert(cotizadorDeals).values({
    entidad,
    cliente: cliente.trim(),
    importe: String(importe),
    cuota: String(cuota),
    plazo_meses: Number(plazo_meses),
  }).returning();

  return NextResponse.json(deal);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });

  await db.delete(cotizadorDeals).where(eq(cotizadorDeals.id, id));
  return NextResponse.json({ ok: true });
}
