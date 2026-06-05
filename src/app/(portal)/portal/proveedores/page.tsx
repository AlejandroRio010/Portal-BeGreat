import { auth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import NuevoProveedorForm from "./NuevoProveedorForm";

export const dynamic = "force-dynamic";

export default async function PortalProveedoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user!.id as string;

  const proveedores = await db
    .select({
      id: suppliers.id, nombre: suppliers.nombre, email: suppliers.email,
      telefono: suppliers.telefono, web: suppliers.web,
      persona_contacto: suppliers.persona_contacto, codigo: suppliers.codigo,
    })
    .from(suppliers)
    .where(eq(suppliers.collaborator_id, userId))
    .orderBy(suppliers.nombre);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Mis proveedores</h1>
          <p className="text-sm text-gray-400 mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""}</p>
        </div>
        <NuevoProveedorForm />
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no has dado de alta ningún proveedor.</p>
          <p className="text-gray-300 text-xs mt-1">Registra los proveedores que suministran los equipos de tus operaciones de renting.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Web</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proveedores.map(p => (
                <tr key={p.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <Link href={`/portal/proveedores/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-[#2E1A47] hover:underline">{p.nombre}</Link>
                    {p.persona_contacto && <p className="text-xs text-gray-400 mt-0.5">{p.persona_contacto}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.telefono ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">
                    {p.web ? <a href={p.web} target="_blank" rel="noopener noreferrer" className="text-[#2E1A47] hover:underline">{p.web}</a> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
