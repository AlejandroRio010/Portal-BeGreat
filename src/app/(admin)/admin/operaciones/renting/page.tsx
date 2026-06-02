import { db } from "@/db";
import { operations, clients, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import KanbanBoard from "./KanbanBoard";

export default async function AdminRentingKanbanPage() {
  const ops = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
      client_nombre: clients.nombre,
      colaborador_nombre: collaborators.nombre,
      fase: operations.fase,
      status: operations.status,
      importe: operations.importe,
      comision_colaborador: operations.comision_colaborador,
      comision_begreat: operations.comision_begreat,
      facturacion_renting: operations.facturacion_renting,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .where(eq(operations.pipeline_key, "renting"))
    .orderBy(operations.created_at);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Renting — Kanban</h1>
        <p className="text-sm text-gray-400 mt-1">Arrastra las operaciones entre columnas para actualizar su fase.</p>
      </div>
      <KanbanBoard initialOps={ops.map((op) => ({
        ...op,
        importe: op.importe ?? null,
        comision_colaborador: op.comision_colaborador ?? null,
        comision_begreat: op.comision_begreat ?? null,
      }))} />
    </div>
  );
}
