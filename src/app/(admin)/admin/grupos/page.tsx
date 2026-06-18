import { db } from "@/db";
import { clientGroups, clients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import NuevoGrupoForm from "@/components/NuevoGrupoForm";

export const dynamic = "force-dynamic";

export default async function AdminGruposPage() {
  const grupos = await db
    .select({
      id: clientGroups.id,
      nombre: clientGroups.nombre,
      descripcion: clientGroups.descripcion,
      web: clientGroups.web,
      codigo: clientGroups.codigo,
      num_empresas: sql<number>`(SELECT COUNT(*) FROM clients WHERE clients.group_id = ${clientGroups.id})`,
    })
    .from(clientGroups)
    .orderBy(clientGroups.nombre);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos empresariales</h1>
          <p className="text-sm text-gray-400 mt-1">{grupos.length} grupo{grupos.length !== 1 ? "s" : ""}</p>
        </div>
        <NuevoGrupoForm />
      </div>

      {grupos.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no hay grupos empresariales.</p>
          <p className="text-gray-300 text-xs mt-1">Crea uno para agrupar empresas que pertenecen al mismo holding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(g => (
            <Link key={g.id} href={`/admin/grupos/${g.id}`}
              className="bg-white border border-gray-200 p-5 hover:border-[#2E1A47]/30 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] font-bold">
                  {g.nombre.charAt(0).toUpperCase()}
                </div>
                {g.codigo && <span className="text-[10px] font-mono text-gray-300">{g.codigo}</span>}
              </div>
              <p className="font-semibold text-gray-900 group-hover:text-[#2E1A47]">{g.nombre}</p>
              {g.descripcion && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{g.descripcion}</p>}
              <p className="text-xs text-[#2E1A47] font-semibold mt-3">{Number(g.num_empresas)} empresa{Number(g.num_empresas) !== 1 ? "s" : ""}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
