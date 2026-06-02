import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const {
    fase,
    status,
    comision_colaborador,
    comision_begreat,
    entidad_financiera,
    honorarios_firmado,
  } = body;

  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (fase !== undefined) updateData.fase = fase;
  if (status !== undefined) updateData.status = status;
  if (comision_colaborador !== undefined)
    updateData.comision_colaborador = comision_colaborador === "" ? null : comision_colaborador;
  if (comision_begreat !== undefined)
    updateData.comision_begreat = comision_begreat === "" ? null : comision_begreat;
  if (entidad_financiera !== undefined)
    updateData.entidad_financiera = entidad_financiera === "" ? null : entidad_financiera;
  if (honorarios_firmado !== undefined) updateData.honorarios_firmado = honorarios_firmado;

  await db.update(operations).set(updateData).where(eq(operations.id, id));

  return NextResponse.json({ ok: true });
}
