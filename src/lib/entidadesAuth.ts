import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function canManageEntidades(session: any): Promise<boolean> {
  if (!session?.user) return false;
  if ((session.user as any).role === "admin") return true;
  const userId = session.user.id as string;
  const [c] = await db
    .select({ nivel: collaborators.nivel_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  return (c?.nivel ?? 4) === 1;
}
