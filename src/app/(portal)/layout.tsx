import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "colaborador") redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex min-h-screen">
      <Sidebar nombre={user.nombre} identificador={user.identificador} role="colaborador" />
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
