import { db } from "@/db";
import { financialEntities, entityOffices, operations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import NuevaEntidadForm from "./NuevaEntidadForm";
import EntidadesClient from "./EntidadesClient";

export const dynamic = "force-dynamic";

export default async function EntidadesPage() {
  const entidades = await db
    .select()
    .from(financialEntities)
    .orderBy(financialEntities.nombre);

  // Count offices per entity
  const officeCounts = await db
    .select({ entity_id: entityOffices.entity_id, count: sql<number>`COUNT(*)` })
    .from(entityOffices)
    .groupBy(entityOffices.entity_id);

  const officeMap = Object.fromEntries(officeCounts.map(r => [r.entity_id, Number(r.count)]));

  // Count ops per entity (via their offices)
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entidades financieras</h1>
          <p className="text-sm text-gray-400 mt-1">{entidades.length} entidades registradas</p>
        </div>
      </div>

      <EntidadesClient entidades={data} />

      <div className="mt-8">
        <NuevaEntidadForm />
      </div>
    </div>
  );
}
