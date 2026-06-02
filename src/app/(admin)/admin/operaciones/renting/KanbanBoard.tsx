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

const FASE_COLORS: Record<string, { dot: string; header: string }> = {
  "Pre-análisis":           { dot: "bg-gray-400",    header: "border-t-gray-300" },
  "En estudio por entidad": { dot: "bg-amber-400",   header: "border-t-amber-400" },
  "Operación aprobada":     { dot: "bg-blue-400",    header: "border-t-blue-400" },
  "Condiciones aceptadas":  { dot: "bg-indigo-400",  header: "border-t-indigo-400" },
  "Contrato firmado":       { dot: "bg-violet-500",  header: "border-t-violet-500" },
  "Transferencia realizada":{ dot: "bg-emerald-500", header: "border-t-emerald-500" },
};

function fmtEur(val: string | null | undefined) {
  if (!val || val === "0") return null;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(val));
}

function DroppableColumn({ fase, ops, activeId }: { fase: string; ops: KanbanOp[]; activeId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: fase });
  const colors = FASE_COLORS[fase] ?? { dot: "bg-[#2E1A47]", header: "border-t-[#2E1A47]" };
  const totalImporte = ops.reduce((s, op) => s + (op.importe ? Number(op.importe) : 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-60 flex flex-col border-t-[3px] ${colors.header} ${isOver ? "bg-[#EEEBF3]" : "bg-[#f3f2f7]"} transition-colors`}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
          <p className="text-[11px] font-bold text-[#2E1A47] uppercase tracking-wider leading-tight">{fase}</p>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <span className="text-[10px] text-gray-400 font-semibold">{ops.length} op{ops.length !== 1 ? "s" : ""}</span>
          {totalImporte > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] text-gray-500 font-semibold">{totalImporte.toLocaleString("es-ES")} €</span>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-3 space-y-2 min-h-[300px]">
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 shadow-sm group transition-all hover:shadow-md hover:border-[#2E1A47]/30 ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent op={op} linkBase={linkBase} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function CardContent({ op, linkBase, dragListeners, dragAttributes }: { op: KanbanOp; linkBase: string; dragListeners?: any; dragAttributes?: any }) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  const fee = (Number(op.comision_colaborador ?? 0) + Number(op.comision_begreat ?? 0));

  return (
    <div className="p-2.5">
      {/* Drag handle + name */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <button
          {...dragListeners}
          {...dragAttributes}
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-0.5"
          title="Arrastrar"
          tabIndex={-1}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/>
            <circle cx="2.5" cy="7" r="1.5"/><circle cx="7.5" cy="7" r="1.5"/>
            <circle cx="2.5" cy="11.5" r="1.5"/><circle cx="7.5" cy="11.5" r="1.5"/>
          </svg>
        </button>
        <Link
          href={`${linkBase}/${op.id}`}
          className="text-[12px] font-semibold text-gray-900 hover:text-[#2E1A47] leading-tight line-clamp-2"
        >
          {displayName}
        </Link>
      </div>

      {/* Colaborador */}
      {op.colaborador_nombre && (
        <p className="text-[10px] text-gray-400 pl-5 mb-1.5 truncate">{op.colaborador_nombre}</p>
      )}

      {/* Footer */}
      <div className="pl-5 flex items-center justify-between gap-1 flex-wrap">
        {fee > 0 && (
          <span className="text-[11px] font-bold text-[#2E1A47] whitespace-nowrap">{fee.toLocaleString("es-ES")} €</span>
        )}
        {op.facturacion_renting && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide ${
            op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"
          }`}>
            {op.facturacion_renting === "begreat" ? "BeGreat" : "Financiera"}
          </span>
        )}
        {op.status === "pendiente_de_validar" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 uppercase tracking-wide">Pendiente</span>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialOps, fases }: { initialOps: KanbanOp[]; fases: string[] }) {
  const [ops, setOps] = useState(initialOps);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeOp = ops.find((op) => op.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) { setActiveId(String(event.active.id)); }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const opId = String(active.id);
    const newFase = String(over.id);
    const op = ops.find((o) => o.id === opId);
    if (!op || op.fase === newFase) return;
    setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: newFase } : o));
    try {
      await fetch(`/api/admin/operations/${opId}/fase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase: newFase }),
      });
    } catch {
      setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: op.fase } : o));
    }
  }

  const opsByFase = fases.reduce<Record<string, KanbanOp[]>>((acc, fase) => {
    acc[fase] = ops.filter((op) => op.fase === fase);
    return acc;
  }, {});

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {fases.map((fase) => (
          <DroppableColumn key={fase} fase={fase} ops={opsByFase[fase]} activeId={activeId} />
        ))}
      </div>
      <DragOverlay>
        {activeOp ? (
          <div className="bg-white border border-[#2E1A47] shadow-xl w-60">
            <CardContent op={activeOp} linkBase="/admin/operaciones" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
