import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import AddNoteForm from "./AddNoteForm";

const FASES_CONSULTORIA = [
  "Pre-analysis",
  "Fee Signature",
  "Under Entity Review",
  "Operation Approved",
  "Contract Signed",
  "Fees Paid",
];

const FASES_RENTING = [
  "Pre-analysis",
  "Under Entity Review",
  "Operation Approved",
  "Terms Accepted",
  "Contract Signed",
  "Transfered Made",
];

const FASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Pre-analysis":        { bg: "bg-gray-100",     text: "text-gray-600",    border: "border-gray-200" },
  "Fee Signature":       { bg: "bg-blue-50",      text: "text-blue-700",    border: "border-blue-200" },
  "Under Entity Review": { bg: "bg-amber-50",     text: "text-amber-700",   border: "border-amber-200" },
  "Operation Approved":  { bg: "bg-emerald-50",   text: "text-emerald-700", border: "border-emerald-200" },
  "Terms Accepted":      { bg: "bg-teal-50",      text: "text-teal-700",    border: "border-teal-200" },
  "Contract Signed":     { bg: "bg-violet-50",    text: "text-violet-700",  border: "border-violet-200" },
  "Fees Paid":           { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
  "Transfered Made":     { bg: "bg-emerald-100",  text: "text-emerald-800", border: "border-emerald-300" },
};

export default async function OperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const [op] = await db
    .select({
      id: operations.id,
      nombre: operations.nombre,
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
      client_id: operations.client_id,
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

  const fases = op.pipeline_key === "consultoria" ? FASES_CONSULTORIA : FASES_RENTING;
  const faseIdx = op.status === "pendiente_de_validar" ? -1 : fases.indexOf(op.fase ?? "");
  const faseStyle = op.fase ? (FASE_COLOR[op.fase] ?? FASE_COLOR["Pre-analysis"]) : FASE_COLOR["Pre-analysis"];

  const isPendiente = op.status === "pendiente_de_validar";
  const isConsultoria = op.pipeline_key === "consultoria";

  return (
    <div>
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link href={isConsultoria ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting"} className="hover:text-[#2E1A47] transition-colors">
          {isConsultoria ? "Consultoría financiera" : "Renting de equipos"}
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">{op.nombre ?? op.client_nombre ?? "Operación"}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{op.nombre ?? op.client_nombre ?? "Operación"}</h1>
          {op.nombre && op.client_nombre && (
            <p className="text-sm text-gray-400 mt-0.5">{op.client_nombre}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">{isConsultoria ? "Consultoría financiera" : "Renting de equipos"}</p>
        </div>
        {isPendiente ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pendiente de validar
          </span>
        ) : (
          <span className={`px-3 py-1.5 text-xs font-semibold border ${faseStyle.bg} ${faseStyle.text} ${faseStyle.border}`}>
            {op.fase}
          </span>
        )}
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2E1A47] p-5">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Importe</p>
          <p className="text-2xl font-black text-white">
            {op.importe ? `${Number(op.importe).toLocaleString("es-ES")} €` : "—"}
          </p>
        </div>
        <div className={`p-5 border ${op.comision_colaborador ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
          <p className={`text-xs uppercase tracking-widest mb-2 font-semibold ${op.comision_colaborador ? "text-emerald-600" : "text-gray-400"}`}>
            Fee / Comisión
          </p>
          <p className={`text-2xl font-black ${op.comision_colaborador ? "text-emerald-700" : "text-gray-300"}`}>
            {op.comision_colaborador ? `${Number(op.comision_colaborador).toLocaleString("es-ES")} €` : "Por confirmar"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Fecha de alta</p>
          <p className="text-lg font-bold text-gray-800">
            {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────── */}
      {!isPendiente && (
        <div className="bg-white border border-gray-200 p-5 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Fase de la operación</p>
          <div className="flex items-center gap-0">
            {fases.map((fase, i) => {
              const done = i <= faseIdx;
              const current = i === faseIdx;
              return (
                <div key={fase} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-3 h-3 border-2 flex-shrink-0 transition-all ${
                      current ? "bg-[#2E1A47] border-[#2E1A47] scale-125" :
                      done    ? "bg-[#2E1A47] border-[#2E1A47]" :
                                "bg-white border-gray-300"
                    }`} />
                    <p className={`text-center mt-2 leading-tight px-1 ${
                      current ? "text-[10px] font-bold text-[#2E1A47]" :
                      done    ? "text-[10px] font-medium text-gray-500" :
                                "text-[10px] text-gray-300"
                    }`} style={{ maxWidth: 80 }}>
                      {fase}
                    </p>
                  </div>
                  {i < fases.length - 1 && (
                    <div className={`h-px flex-1 mx-1 -mt-5 ${i < faseIdx ? "bg-[#2E1A47]" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Fields */}
        <div className="col-span-1 space-y-3">
          <div className="bg-white border border-gray-200 p-5">
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Datos de la operación</p>
            <dl className="space-y-3">
              {[
                { label: "Empresa cliente", value: op.client_nombre, href: op.client_id ? `/portal/clientes/${op.client_id}` : undefined },
                { label: "Producto", value: op.producto },
                { label: "Entidad financiera", value: op.entidad_financiera },
                { label: "Honorarios firmados", value: op.honorarios_firmado != null ? (op.honorarios_firmado ? "Sí" : "No") : null },
                ...(op.pipeline_key === "renting" ? [
                  { label: "Proveedor", value: op.supplier_nombre },
                  { label: "Lugar de entrega", value: op.lugar_entrega },
                ] : []),
                { label: "Descripción", value: op.descripcion },
              ].map((field) => field && field.value != null && field.value !== "" ? (
                <div key={field.label}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{field.label}</dt>
                  <dd className="text-sm text-gray-800 font-medium">
                    {(field as any).href
                      ? <Link href={(field as any).href} className="text-[#2E1A47] hover:underline font-semibold">{field.value}</Link>
                      : field.value}
                  </dd>
                </div>
              ) : null)}
            </dl>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-2 bg-white border border-gray-200 p-5">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">Notas e historial</p>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {opNotes.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">Sin notas todavía.</p>
                <p className="text-xs text-gray-300 mt-1">BeGreat irá actualizando el estado aquí.</p>
              </div>
            ) : (
              opNotes.map((n) => (
                <div key={n.id} className="border-l-2 border-[#2E1A47] pl-4 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#2E1A47]">{n.author_name}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
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
