import { db } from "@/db";
import { suppliers, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminProveedoresPage() {
  const proveedores = await db
    .select({
      id: suppliers.id,
      nombre: suppliers.nombre,
      email: suppliers.email,
      telefono: suppliers.telefono,
      web: suppliers.web,
      persona_contacto: suppliers.persona_contacto,
      colaborador_nombre: collaborators.nombre,
    })
    .from(suppliers)
    .leftJoin(collaborators, eq(suppliers.collaborator_id, collaborators.id))
    .orderBy(suppliers.nombre);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="text-sm text-gray-400 mt-1">{proveedores.length} proveedores</p>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {proveedores.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Sin proveedores registrados.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Web</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-[#EEEBF3]/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                    {p.persona_contacto && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.persona_contacto}</p>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.telefono ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-600">{p.colaborador_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">
                    {p.web
                      ? <a href={p.web} target="_blank" rel="noopener noreferrer" className="text-[#2E1A47] hover:underline">{p.web}</a>
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
