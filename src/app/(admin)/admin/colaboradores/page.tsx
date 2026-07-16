import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import ColaboradorEditModal from "./ColaboradorEditModal";
import AddColaboradorButton from "./AddColaboradorButton";

export default async function AdminColaboradoresPage() {
  const colabs = await db
    .select({
      id: collaborators.id,
      nombre: collaborators.nombre,
      email: collaborators.email,
      identificador: collaborators.identificador,
      activo: collaborators.activo,
      created_at: collaborators.created_at,
      telefono: collaborators.telefono,
      cif: collaborators.cif,
      web: collaborators.web,
      razon_social: collaborators.razon_social,
      num_trabajadores: collaborators.num_trabajadores,
    })
    .from(collaborators)
    .where(eq(collaborators.role, "colaborador"))
    .orderBy(collaborators.nombre);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Colaboradores</h1>
          <p className="text-sm text-gray-500 mt-1">{colabs.length} colaboradores registrados</p>
        </div>
        <AddColaboradorButton />
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#EEEBF3] border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Identificador</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {colabs.map((c) => (
              <tr key={c.id} className="hover:bg-[#EEEBF3]/20 transition-colors group">
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{c.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                <td className="px-6 py-4 text-xs text-gray-400 font-mono">{c.identificador}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${c.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400"}`}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/colaboradores/${c.id}`}
                      className="text-xs text-[#2E1A47] font-semibold hover:underline"
                    >
                      Ver ficha →
                    </Link>
                    <ColaboradorEditModal colab={c} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
