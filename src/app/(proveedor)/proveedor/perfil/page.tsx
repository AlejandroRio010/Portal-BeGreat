import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers, supplierProducts, supplierUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import SupplierDataForm from "./SupplierDataForm";
import ProductCatalog from "./ProductCatalog";

export const dynamic = "force-dynamic";

export default async function PerfilProveedorPage() {
  const session = await auth();
  const supplierId = (session!.user as any).supplierId as string;
  const userId = session!.user!.id as string;

  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  const [user] = await db
    .select({ id: supplierUsers.id, nombre: supplierUsers.nombre, email: supplierUsers.email })
    .from(supplierUsers)
    .where(eq(supplierUsers.id, userId))
    .limit(1);

  const products = await db
    .select()
    .from(supplierProducts)
    .where(eq(supplierProducts.supplier_id, supplierId))
    .orderBy(supplierProducts.created_at);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-1">Gestiona los datos de tu empresa y tu catálogo de productos</p>
      </div>

      <div className="space-y-6">
        <SupplierDataForm supplier={supplier} user={user} />
        <ProductCatalog products={products} />
      </div>
    </div>
  );
}
