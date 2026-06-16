import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { supplierProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import AltaOperacionProveedorForm from "./AltaOperacionProveedorForm";

export const dynamic = "force-dynamic";

export default async function AltaOperacionProveedorPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor") redirect("/login");

  const supplierId = (session.user as any).supplierId as string;
  const productos = await db
    .select({ id: supplierProducts.id, nombre: supplierProducts.nombre, tipo: supplierProducts.tipo, precio_venta: supplierProducts.precio_venta })
    .from(supplierProducts)
    .where(and(eq(supplierProducts.supplier_id, supplierId), eq(supplierProducts.activo, true)))
    .orderBy(supplierProducts.nombre);

  return <AltaOperacionProveedorForm catalogoProductos={productos} />;
}
