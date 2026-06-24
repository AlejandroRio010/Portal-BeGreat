import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";

export default async function ProveedorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor") redirect("/login");

  const supplierId = (session.user as any).supplierId as string;
  const [supplier] = await db
    .select({ nombre: suppliers.nombre, codigo: suppliers.codigo, puede_ver_entidades: suppliers.puede_ver_entidades, logo_url: suppliers.logo_url })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  const nombre = (session.user as any).nombre ?? supplier?.nombre ?? "";
  const identificador = supplier?.codigo ?? (session.user as any).identificador ?? "";

  return (
    <div className="flex min-h-screen">
      <Sidebar nombre={nombre} identificador={identificador} role="proveedor" puedeVerEntidades={supplier?.puede_ver_entidades ?? false} logoUrl={supplier?.logo_url ?? null} />
      <main className="flex-1 ml-64 p-8 min-h-screen bg-[#f8f7fb]">{children}</main>
    </div>
  );
}
