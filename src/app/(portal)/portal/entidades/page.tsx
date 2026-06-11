import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, financialEntities, entityOffices, operations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import PortalEntidadesClient from "./PortalEntidadesClient";

export const dynamic = "force-dynamic";

export default async function PortalEntidadesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user!.id as string;
  const [colab] = await db
    .select({ nivel_entidades: collaborators.nivel_entidades })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const nivel = colab?.nivel_entidades ?? 4;
  if (nivel > 2) notFound();

  const entidades = await db
    .select()
    .from(financialEntities)
    .orderBy(financialEntities.nombre);

  const officeCounts = await db
    .select({ entity_id: entityOffices.entity_id, count: sql<number>`COUNT(*)` })
    .from(entityOffices)
    .groupBy(entityOffices.entity_id);

  const officeMap = Object.fromEntries(officeCounts.map(r => [r.entity_id, Number(r.count)]));

  const opCounts = await db
    .select({ entity_id: entityOffices.entity_id, count: sql<number>`COUNT(DISTINCT ${operations.id})` })
    .from(entityOffices)
    .leftJoin(operations, eq(operations.entity_office_id, entityOffices.id))
    .groupBy(entityOffices.entity_id);

  const opsMap = Object.fromEntries(opCounts.map(r => [r.entity_id, Number(r.count)]));

  const data = entidades.map(e => ({
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    logo_url: e.logo_url ?? null,
    web: e.web ?? null,
    officesCount: officeMap[e.id] ?? 0,
    opsCount: opsMap[e.id] ?? 0,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entidades financieras</h1>
        <p className="text-sm text-gray-400 mt-1">{entidades.length} entidades registradas</p>
      </div>
      <PortalEntidadesClient entidades={data} />
    </div>
  );
}
