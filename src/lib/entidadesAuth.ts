import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Permite gestionar entidades financieras (contactos, etc.) a:
 * - administradores
 * - colaboradores con permiso puede_ver_entidades
 */
export async function canManageEntidades(session: any): Promise<boolean> {
  if (!session?.user) return false;
  if ((session.user as any).role === "admin") return true;
  const userId = session.user.id as string;
  const [c] = await db
    .select({ p: collaborators.puede_ver_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  return !!c?.p;
}
