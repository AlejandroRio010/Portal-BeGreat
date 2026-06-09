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

  return <AltaOpAdminForm colaboradores={colabs} />;
}
