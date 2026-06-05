import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, financialEntities, entityOffices, entityContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

const TIPO_LABEL: Record<string, string> = {
  banco: "Banco",
  alternativa_financiera: "Financiación alternativa",
  renting: "Entidad de renting",
};

export default async function PortalEntidadesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user!.id as string;
  const [colab] = await db
    .select({ puede_ver_entidades: collaborators.puede_ver_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  if (!colab?.puede_ver_entidades) notFound();

  const entidades = await db
    .select()
    .from(financialEntities)
    .orderBy(financialEntities.nombre);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2E1A47]">Entidades financieras</h1>
        <p className="text-sm text-gray-500 mt-1">Directorio de entidades con las que trabaja BeGreat Consulting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entidades.map(e => (
          <Link key={e.id} href={`/portal/entidades/${e.id}`}
            className="bg-white border border-gray-200 p-5 hover:border-[#2E1A47]/30 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-4">
              {e.logo_url ? (
                <img src={e.logo_url} alt={e.nombre} className="w-10 h-10 object-contain flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-[#EEEBF3] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#2E1A47]">{e.nombre.charAt(0)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 group-hover:text-[#2E1A47] truncate">{e.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>
                {e.web && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{e.web}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
