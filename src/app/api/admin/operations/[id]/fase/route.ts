import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { eq } from "drizzle-orm";

const FASES_FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const { fase, notas_admin, facturacion_renting, onedrive_url } = body;

  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (fase !== undefined) {
    updateData.fase = fase;
    // Set status to activa regardless (already activa ops stay activa, or we activate pending ones)
    updateData.status = "activa";
  }
  if (notas_admin !== undefined) updateData.notas_admin = notas_admin || null;
  if (facturacion_renting !== undefined) updateData.facturacion_renting = facturacion_renting || null;
  if (onedrive_url !== undefined) updateData.onedrive_url = onedrive_url || null;

  await db.update(operations).set(updateData).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
