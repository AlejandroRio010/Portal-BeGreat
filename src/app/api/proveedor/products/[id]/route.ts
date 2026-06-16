import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { supplierProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const { id } = await params;

  const [existing] = await db
    .select({ id: supplierProducts.id })
    .from(supplierProducts)
    .where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplier_id, supplierId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nombre !== undefined) data.nombre = body.nombre;
  if (body.descripcion !== undefined) data.descripcion = body.descripcion || null;
  if (body.tipo !== undefined) data.tipo = body.tipo || null;
  if (body.precio_venta !== undefined) data.precio_venta = body.precio_venta || null;
  if (typeof body.activo === "boolean") data.activo = body.activo;

  await db.update(supplierProducts).set(data).where(eq(supplierProducts.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const { id } = await params;

  const [existing] = await db
    .select({ id: supplierProducts.id })
    .from(supplierProducts)
    .where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplier_id, supplierId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.delete(supplierProducts).where(eq(supplierProducts.id, id));

  return NextResponse.json({ ok: true });
}
