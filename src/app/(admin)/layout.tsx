import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") redirect("/login");

  const userId = session.user!.id as string;
  const [admin] = await db
    .select({ nombre: collaborators.nombre, identificador: collaborators.identificador })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const nombre = admin?.nombre ?? (session.user as any).nombre ?? "Admin";
  const identificador = admin?.identificador ?? "ADMIN";

  return (
    <div className="flex min-h-screen">
      <Sidebar nombre={nombre} identificador={identificador} role="admin" />
      <main className="flex-1 ml-64 p-8 min-h-screen bg-[#f8f7fb]">{children}</main>
    </div>
  );
}
