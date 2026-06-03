"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import Link from "next/link";

export interface KanbanOp {
  id: string;
  nombre: string | null;
  client_nombre: string | null;
  colaborador_nombre: string | null;
  fase: string;
  status: string;
  importe: string | null;
  comision_colaborador: string | null;
  comision_begreat: string | null;
  facturacion_renting: string | null;
}

const FASE_ACCENT: Record<string, string> = {
  "Pre-análisis":           "border-l-gray-300",
  "En estudio por entidad": "border-l-amber-400",
  "Operación aprobada":     "border-l-blue-400",
  "Condiciones aceptadas":  "border-l-indigo-400",
  "Contrato firmado":       "border-l-violet-500",
  "Transferencia realizada":"border-l-emerald-500",
};
const FASE_DOT: Record<string, string> = {
  "Pre-análisis":           "bg-gray-300",
  "En estudio por entidad": "bg-amber-400",
  "Operación aprobada":     "bg-blue-400",
  "Condiciones aceptadas":  "bg-indigo-400",
  "Contrato firmado":       "bg-violet-500",
  "Transferencia realizada":"bg-emerald-500",
};

function DroppableColumn({ fase, ops, activeId }: { fase: string; ops: KanbanOp[]; activeId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: fase });
  const dot = FASE_DOT[fase] ?? "bg-[#2E1A47]";
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-[200px] flex flex-col transition-colors ${isOver ? "bg-[#EEEBF3]/60" : ""}`}>
      {/* Header */}
      <div className="px-2 py-3 mb-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <p className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-widest leading-tight truncate">{fase}</p>
        </div>
        <div className="flex items-center gap-1.5 pl-4">
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">{ops.length}</span>
          {totalImporte > 0 && <span className="text-[9px] text-gray-400">{totalImporte.toLocaleString("es-ES")} €</span>}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-1.5 min-h-[400px] px-1">
        {ops.map((op) => (
          <DraggableCard key={op.id} op={op} isDragging={activeId === op.id} linkBase="/admin/operaciones" />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ op, isDragging, linkBase }: { op: KanbanOp; isDragging: boolean; linkBase: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: op.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const accent = FASE_ACCENT[op.fase] ?? "border-l-[#2E1A47]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-gray-200 transition-all group ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent op={op} linkBase={linkBase} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

export function CardContent({ op, linkBase, dragListeners, dragAttributes }: {
  op: KanbanOp; linkBase: string; dragListeners?: any; dragAttributes?: any;
}) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  const fee = Number(op.comision_colaborador ?? 0) + Number(op.comision_begreat ?? 0);

  return (
    <div className="p-2.5 pt-2">
      {/* Drag handle */}
      <div className="flex items-start gap-1 mb-1.5">
        <button
          {...dragListeners} {...dragAttributes}
          className="mt-0.5 flex-shrink-0 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1} title="Arrastrar"
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
            <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
            <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
          </svg>
        </button>
        <Link href={`${linkBase}/${op.id}`} className="text-[11px] font-semibold text-gray-800 hover:text-[#2E1A47] leading-tight line-clamp-2 flex-1">
          {displayName}
        </Link>
      </div>

      {op.colaborador_nombre && (
        <p className="text-[9px] text-gray-400 pl-4 mb-1.5 truncate">{op.colaborador_nombre}</p>
      )}

      <div className="pl-4 flex items-center flex-wrap gap-1">
        {fee > 0 && <span className="text-[10px] font-bold text-[#2E1A47] whitespace-nowrap">{fee.toLocaleString("es-ES")} €</span>}
        {op.facturacion_renting && (
          <span className={`text-[8px] font-bold px-1 py-0.5 uppercase tracking-wide ${op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"}`}>
            {op.facturacion_renting === "begreat" ? "BG" : "FIN"}
          </span>
        )}
        {op.status === "pendiente_de_validar" && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title="Pendiente de validar" />
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialOps, fases }: { initialOps: KanbanOp[]; fases: string[] }) {
  const [ops, setOps] = useState(initialOps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeOp = ops.find((o) => o.id === activeId) ?? null;

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const opId = String(active.id);
    const newFase = String(over.id);
    const op = ops.find((o) => o.id === opId);
    if (!op || op.fase === newFase) return;
    setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: newFase } : o));
    try {
      await fetch(`/api/admin/operations/${opId}/fase`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fase: newFase }) });
    } catch {
      setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: op.fase } : o));
    }
  }

  const opsByFase = fases.reduce<Record<string, KanbanOp[]>>((acc, f) => { acc[f] = ops.filter((o) => o.fase === f); return acc; }, {});

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-2 overflow-x-auto pb-4">
        {fases.map((fase) => (
          <DroppableColumn key={fase} fase={fase} ops={opsByFase[fase]} activeId={activeId} />
        ))}
      </div>
      <DragOverlay>
        {activeOp && (
          <div className={`bg-white border border-gray-100 border-l-[3px] ${FASE_ACCENT[activeOp.fase] ?? "border-l-[#2E1A47]"} shadow-xl w-[200px]`}>
            <CardContent op={activeOp} linkBase="/admin/operaciones" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
