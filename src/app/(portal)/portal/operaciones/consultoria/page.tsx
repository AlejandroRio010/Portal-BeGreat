import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, pipelines, collaborators } from "@/db/schema";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import Link from "next/link";
import PortalKanban from "./PortalKanban";

export const dynamic = "force-dynamic";

const FASES_DEFAULT = [
  "Pre-análisis", "Firma de honorarios", "En estudio por entidad",
  "Operación aprobada", "Contrato firmado", "Honorarios pagados",
];

export default async function ConsultoriaPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [pc] = await db.select().from(pipelines).where(eq(pipelines.key, "consultoria")).limit(1);
  const fases = (pc?.fases as string[]) ?? FASES_DEFAULT;

  const [colab] = await db.select({ puede_editar_ops: collaborators.puede_editar_ops }).from(collaborators).where(eq(collaborators.id, userId)).limit(1);
  const puedeEditar = colab?.puede_editar_ops ?? false;

  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(and(eq(operations.collaborator_id, userId), eq(operations.pipeline_key, "consultoria"), inArray(operations.status, ["activa", "pendiente_de_validar"]), notInArray(operations.fase, ["Honorarios pagados"])))
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Consultoría financiera</h1>
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
          <p className="text-gray-400 text-sm mb-4">Todavía no tienes operaciones de consultoría</p>
          <Link href="/portal/alta-operacion" className="inline-block bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors">
            + Dar de alta operación
          </Link>
        </div>
      ) : (
        <PortalKanban ops={ops.map(o => ({ ...o, importe: o.importe ?? null, comision_colaborador: o.comision_colaborador ?? null }))} fases={fases} canEdit={puedeEditar} />
      )}
    </div>
  );
}
