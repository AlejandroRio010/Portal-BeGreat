import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AltaOperacionForm from "./AltaOperacionForm";

export const dynamic = "force-dynamic";

export default async function AltaOperacionPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  const [colab] = await db
    .select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const nivelEntidades = colab?.nivel_entidades ?? 4;

  return <AltaOperacionForm nivelEntidades={nivelEntidades} />;
}
