import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, pipelines, collaborators } from "@/db/schema";
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

  const [colab] = await db.select({ puede_editar_ops: collaborators.puede_editar_ops }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  const puedeEditar = colab?.puede_editar_ops ?? false;

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_begreat: operations.comision_begreat,
      facturacion_renting: operations.facturacion_renting,
      plazo_meses: operations.plazo_meses,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(eq(operations.collaborator_id, userId), eq(operations.pipeline_key, "renting"), eq(operations.status, "activa")))
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Operaciones de Renting</h1>
          <p className="text-sm text-gray-400 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""}</p>
        </div>
        <Link
          href="/portal/alta-operacion"
          className="inline-flex flex-shrink-0 items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors whitespace-nowrap"
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
          ops={ops.map(o => ({ ...o, importe: o.importe ?? null, comision_begreat: o.comision_begreat ?? null, facturacion_renting: o.facturacion_renting ?? null, plazo_meses: o.plazo_meses ?? null }))}
          fases={fases}
          canEdit={puedeEditar}
        />
      )}
    </div>
  );
}
