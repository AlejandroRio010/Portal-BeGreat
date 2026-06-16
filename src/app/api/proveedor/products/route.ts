import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { supplierProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const products = await db
    .select()
    .from(supplierProducts)
    .where(eq(supplierProducts.supplier_id, supplierId))
    .orderBy(supplierProducts.created_at);

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const body = await req.json();

  if (!body.nombre?.trim())
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const [product] = await db
    .insert(supplierProducts)
    .values({
      supplier_id: supplierId,
      nombre: body.nombre.trim(),
      descripcion: body.descripcion || null,
      tipo: body.tipo || null,
      precio_venta: body.precio_venta || null,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
