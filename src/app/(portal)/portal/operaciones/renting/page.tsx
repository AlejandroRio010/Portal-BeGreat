import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, pipelines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import PortalKanbanRenting from "./PortalKanbanRenting";

const FASES_DEFAULT = [
  "Pre-análisis", "En estudio por entidad", "Operación aprobada",
  "Condiciones aceptadas", "Contrato firmado", "Transferencia realizada",
];

export default async function RentingPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [pr] = await db.select().from(pipelines).where(eq(pipelines.key, "renting")).limit(1);
  const fases = (pr?.fases as string[]) ?? FASES_DEFAULT;

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      facturacion_renting: operations.facturacion_renting,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(eq(operations.collaborator_id, userId), eq(operations.pipeline_key, "renting")))
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operaciones de Renting</h1>
          <p className="text-sm text-gray-400 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""}</p>
        </div>
        <Link
          href="/portal/alta-operacion"
          className="inline-flex items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors"
        >
          + Nueva operación
        </Link>
      </div>

      {ops.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm mb-4">Todavía no tienes operaciones de renting</p>
          <Link href="/portal/alta-operacion" className="inline-block bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors">
            + Dar de alta operación
          </Link>
        </div>
      ) : (
        <PortalKanbanRenting
          ops={ops.map(o => ({ ...o, importe: o.importe ?? null, comision_colaborador: o.comision_colaborador ?? null, facturacion_renting: o.facturacion_renting ?? null }))}
          fases={fases}
        />
      )}
    </div>
  );
}
