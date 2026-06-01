import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex min-h-screen">
      <Sidebar nombre={user.nombre} identificador="ADMIN" role="admin" />
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
