import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import AltaOpAdminForm from "./AltaOpAdminForm";

export default async function AdminAltaOperacionPage() {
  const colabs = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre, codigo: collaborators.codigo })
    .from(collaborators)
    .where(eq(collaborators.activo, true))
    .orderBy(collaborators.nombre);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-400 mt-1">Crear una operación desde el panel de administración</p>
      </div>
      <AltaOpAdminForm colaboradores={colabs} />
    </div>
  );
}
