import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, notes, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import AddNoteForm from "./AddNoteForm";

export default async function OperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const [op] = await db
    .select({
      id: operations.id,
      pipeline_key: operations.pipeline_key,
      producto: operations.producto,
      importe: operations.importe,
      fase: operations.fase,
      status: operations.status,
      comision_colaborador: operations.comision_colaborador,
      entidad_financiera: operations.entidad_financiera,
      honorarios_firmado: operations.honorarios_firmado,
      descripcion: operations.descripcion,
      lugar_entrega: operations.lugar_entrega,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
      supplier_nombre: suppliers.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .leftJoin(suppliers, eq(operations.supplier_id, suppliers.id))
    .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId)))
    .limit(1);

  if (!op) notFound();

  const opNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.operation_id, id))
    .orderBy(notes.created_at);

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value ?? "—"}</p>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
          op.status === "pendiente_de_validar" ? "bg-orange-100 text-orange-700" : "bg-[#EEEBF3] text-[#2E1A47]"
        }`}>
          {op.status === "pendiente_de_validar" ? "Pendiente de validar" : op.fase}
        </span>
        <h1 className="text-2xl font-semibold text-gray-900">
          {op.client_nombre ?? "Operación"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {op.pipeline_key === "consultoria" ? "Consultoría financiera" : "Renting"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Fields */}
        <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos de la operación</h2>
          <Field label="Empresa cliente" value={op.client_nombre} />
          <Field label="Producto" value={op.producto} />
          <Field label="Importe" value={op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : null} />
          <Field label="Entidad financiera" value={op.entidad_financiera} />
          <Field label="Comisión colaborador" value={op.comision_colaborador ? `${Number(op.comision_colaborador).toLocaleString("es-ES")} €` : null} />
          <Field label="Honorarios firmados" value={op.honorarios_firmado ? "Sí" : "No"} />
          {op.pipeline_key === "renting" && (
            <>
              <Field label="Proveedor" value={op.supplier_nombre} />
              <Field label="Lugar de entrega" value={op.lugar_entrega} />
            </>
          )}
          <Field label="Descripción" value={op.descripcion} />
          <Field
            label="Alta"
            value={new Date(op.created_at).toLocaleDateString("es-ES", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
        </div>

        {/* Notes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Notas e historial</h2>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {opNotes.length === 0 ? (
              <p className="text-sm text-gray-400">Sin notas todavía.</p>
            ) : (
              opNotes.map((n) => (
                <div key={n.id} className="bg-[#EEEBF3] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#2E1A47]">{n.author_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleDateString("es-ES", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{n.texto}</p>
                </div>
              ))
            )}
          </div>

          <AddNoteForm operationId={id} />
        </div>
      </div>
    </div>
  );
}
