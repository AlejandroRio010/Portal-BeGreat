import { db } from "@/db";
import { suppliers, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProveedoresTabla from "@/components/ProveedoresTabla";
import NuevoProveedorModal from "./NuevoProveedorModal";

export const dynamic = "force-dynamic";

export default async function AdminProveedoresPage() {
  const proveedores = await db
    .select({
      id: suppliers.id,
      nombre: suppliers.nombre,
      codigo: suppliers.codigo,
      email: suppliers.email,
      telefono: suppliers.telefono,
      web: suppliers.web,
      persona_contacto: suppliers.persona_contacto,
      colaborador_id: suppliers.collaborator_id,
      colaborador_nombre: collaborators.nombre,
    })
    .from(suppliers)
    .leftJoin(collaborators, eq(suppliers.collaborator_id, collaborators.id))
    .orderBy(suppliers.nombre);

  const colabs = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre, role: collaborators.role })
    .from(collaborators)
    .orderBy(collaborators.nombre);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-400 mt-1">{proveedores.length} proveedores</p>
        </div>
        <NuevoProveedorModal colaboradores={colabs} />
      </div>
      <ProveedoresTabla esAdmin hrefBase="/admin/proveedores" colaboradores={colabs} proveedores={proveedores} />
    </div>
  );
}
