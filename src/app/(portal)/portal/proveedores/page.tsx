import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import NuevoProveedorForm from "./NuevoProveedorForm";
import ProveedoresTabla from "@/components/ProveedoresTabla";

export const dynamic = "force-dynamic";

export default async function PortalProveedoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  const proveedores = await db
    .select({
      id: suppliers.id, nombre: suppliers.nombre, email: suppliers.email,
      telefono: suppliers.telefono, web: suppliers.web,
      persona_contacto: suppliers.persona_contacto, codigo: suppliers.codigo,
    })
    .from(suppliers)
    .where(eq(suppliers.collaborator_id, userId))
    .orderBy(suppliers.nombre);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Mis proveedores</h1>
          <p className="text-sm text-gray-400 mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""}</p>
        </div>
        <NuevoProveedorForm />
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no has dado de alta ningún proveedor.</p>
        </div>
      ) : (
        <ProveedoresTabla esAdmin={false} hrefBase="/portal/proveedores" proveedores={proveedores.map(p => ({ ...p, colaborador_id: null, colaborador_nombre: null }))} />
      )}
    </div>
  );
}
