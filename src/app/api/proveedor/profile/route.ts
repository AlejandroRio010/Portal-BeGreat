import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = body.nombre;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.telefono !== undefined) data.telefono = body.telefono || null;
  if (body.web !== undefined) data.web = body.web || null;
  if (body.cif !== undefined) data.cif = body.cif || null;
  if (body.razon_social !== undefined) data.razon_social = body.razon_social || null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No data" }, { status: 400 });

  await db.update(suppliers).set(data).where(eq(suppliers.id, supplierId));

  return NextResponse.json({ ok: true });
}
