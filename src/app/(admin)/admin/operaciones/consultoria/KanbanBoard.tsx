"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
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
}

function DroppableColumn({
  fase,
  ops,
  activeId,
}: {
  fase: string;
  ops: KanbanOp[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: fase });

  const totalImporte = ops.reduce((sum, op) => sum + (op.importe ? Number(op.importe) : 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#f8f7fb] border border-gray-200 min-h-[400px] w-64 flex-shrink-0 p-3 transition-colors ${isOver ? "border-[#2E1A47] bg-[#EEEBF3]" : ""}`}
    >
      {/* Column header */}
      <div className="mb-3">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider leading-tight">{fase}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{ops.length} op{ops.length !== 1 ? "s" : ""}</span>
          {totalImporte > 0 && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-500 font-medium">{totalImporte.toLocaleString("es-ES")} €</span>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {ops.map((op) => (
          <DraggableCard key={op.id} op={op} isDragging={activeId === op.id} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ op, isDragging }: { op: KanbanOp; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: op.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-gray-200 p-3 cursor-grab hover:border-[#2E1A47] transition-colors ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent op={op} />
    </div>
  );
}

function CardContent({ op }: { op: KanbanOp }) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  return (
    <>
      <Link
        href={`/admin/operaciones/${op.id}`}
        className="block text-sm font-semibold text-gray-900 hover:text-[#2E1A47] leading-tight mb-1"
        onClick={(e) => e.stopPropagation()}
      >
        {displayName}
      </Link>
      {op.colaborador_nombre && (
        <p className="text-xs text-gray-400 mb-2">{op.colaborador_nombre}</p>
      )}
      {op.importe && (
        <span className="text-xs font-bold text-gray-700">
          {Number(op.importe).toLocaleString("es-ES")} €
        </span>
      )}
    </>
  );
}

export default function KanbanBoard({ initialOps, fases }: { initialOps: KanbanOp[]; fases: string[] }) {
  const [ops, setOps] = useState(initialOps);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeOp = ops.find((op) => op.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const opId = String(active.id);
    const newFase = String(over.id);
    const op = ops.find((o) => o.id === opId);
    if (!op || op.fase === newFase) return;

    // Optimistic update
    setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: newFase } : o));

    try {
      await fetch(`/api/admin/operations/${opId}/fase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase: newFase }),
      });
    } catch {
      // Revert on error
      setOps((prev) => prev.map((o) => o.id === opId ? { ...o, fase: op.fase } : o));
    }
  }

  const opsByFase = fases.reduce<Record<string, KanbanOp[]>>((acc, fase) => {
    acc[fase] = ops.filter((op) => op.fase === fase);
    return acc;
  }, {});

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {fases.map((fase) => (
          <DroppableColumn key={fase} fase={fase} ops={opsByFase[fase]} activeId={activeId} />
        ))}
      </div>
      <DragOverlay>
        {activeOp ? (
          <div className="bg-white border border-[#2E1A47] p-3 w-64 shadow-lg cursor-grabbing">
            <CardContent op={activeOp} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
