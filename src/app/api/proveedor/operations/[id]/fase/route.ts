import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const { id } = await params;

  const [op] = await db
    .select({ id: operations.id, fecha_cierre: operations.fecha_cierre })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.supplier_id, supplierId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const { fase } = await req.json();
  if (!fase) return NextResponse.json({ error: "Fase requerida" }, { status: 400 });

  const updateData: Record<string, unknown> = { fase, updated_at: new Date() };
  if (FIRMADAS.includes(fase) && !op.fecha_cierre) {
    updateData.fecha_cierre = new Date();
  }

  await db.update(operations).set(updateData).where(eq(operations.id, id));
  return NextResponse.json({ ok: true });
}
