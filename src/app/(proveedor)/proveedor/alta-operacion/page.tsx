import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AltaOperacionProveedorForm from "./AltaOperacionProveedorForm";

export const dynamic = "force-dynamic";

export default async function AltaOperacionProveedorPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor") redirect("/login");

  return <AltaOperacionProveedorForm />;
}
