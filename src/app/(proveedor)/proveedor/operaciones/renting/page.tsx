import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, pipelines } from "@/db/schema";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import PortalKanbanRenting from "./PortalKanbanRenting";

export const dynamic = "force-dynamic";

const FASES_DEFAULT = [
  "Pre-análisis", "En estudio por entidad", "Operación aprobada",
  "Condiciones aceptadas", "Contrato firmado", "Transferencia realizada",
];

export default async function RentingPage() {
  const session = await auth();
  const supplierId = (session!.user as any).supplierId as string;

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
      modalidad_renting: operations.modalidad_renting,
      importe_facturado_begreat: operations.importe_facturado_begreat,
      importe_facturado_visible: operations.importe_facturado_visible,
      plazo_meses: operations.plazo_meses,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(eq(operations.supplier_id, supplierId), eq(operations.pipeline_key, "renting"), inArray(operations.status, ["activa", "pendiente_de_validar"]), notInArray(operations.fase, ["Transferencia realizada"])))
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Operaciones de Renting</h1>
          <p className="text-sm text-gray-400 mt-1">{ops.length} operación{ops.length !== 1 ? "es" : ""}</p>
        </div>
      </div>

      {ops.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Todavía no tienes operaciones de renting</p>
        </div>
      ) : (
        <PortalKanbanRenting
          ops={ops.map(o => ({ ...o, importe: o.importe ?? null, comision_colaborador: o.comision_colaborador ?? null, facturacion_renting: o.facturacion_renting ?? null, modalidad_renting: o.modalidad_renting ?? null, importe_facturado_begreat: o.importe_facturado_begreat ?? null, importe_facturado_visible: o.importe_facturado_visible ?? false, plazo_meses: o.plazo_meses ?? null }))}
          fases={fases.filter(f => f !== "Transferencia realizada")}
          canEdit={true}
        />
      )}
    </div>
  );
}
