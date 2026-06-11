import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "colaborador") redirect("/login");

  const userId = session.user!.id as string;
  // Fetch nombre desde BD para reflejar cambios de perfil sin necesidad de volver a iniciar sesión
  const [colab] = await db
    .select({ nombre: collaborators.nombre, identificador: collaborators.identificador, nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const nombre = colab?.nombre ?? (session.user as any).nombre ?? "";
  const identificador = colab?.identificador ?? (session.user as any).identificador ?? "";
  const nivelEntidades = colab?.nivel_entidades ?? 4;

  return (
    <div className="flex min-h-screen">
      <Sidebar nombre={nombre} identificador={identificador} role="colaborador" nivelEntidades={nivelEntidades} />
      <main className="flex-1 ml-64 p-8 min-h-screen bg-[#f8f7fb]">{children}</main>
    </div>
  );
}
