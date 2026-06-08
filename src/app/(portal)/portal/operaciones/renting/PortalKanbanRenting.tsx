"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import Link from "next/link";
import { fmtNum } from "@/lib/format";

interface Op {
  id: string;
  nombre: string | null;
  client_nombre: string | null;
  fase: string;
  status: string;
  importe: string | null;
  comision_colaborador: string | null;
  facturacion_renting: string | null;
  plazo_meses: number | null;
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
const FASE_BAR: Record<string, string> = {
  "Pre-análisis":           "bg-gray-300",
  "En estudio por entidad": "bg-amber-400",
  "Operación aprobada":     "bg-blue-400",
  "Condiciones aceptadas":  "bg-indigo-400",
  "Contrato firmado":       "bg-violet-500",
  "Transferencia realizada":"bg-emerald-500",
};

function CardContent({ op, dragListeners, dragAttributes, canEdit }: { op: Op; dragListeners?: any; dragAttributes?: any; canEdit?: boolean }) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  const fee = Number(op.comision_colaborador ?? 0);
  return (
    <div className="p-2.5 pt-2">
      <div className="flex items-start gap-1 mb-1.5">
        {canEdit && (
          <button {...dragListeners} {...dragAttributes} className="mt-0.5 flex-shrink-0 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none" tabIndex={-1}>
            <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
              <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
              <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
              <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
            </svg>
          </button>
        )}
        <Link href={`/portal/operaciones/${op.id}`} className="text-[11px] font-semibold text-gray-800 hover:text-[#2E1A47] leading-tight line-clamp-2 flex-1">
          {displayName}
        </Link>
      </div>
      {op.client_nombre && op.nombre && <p className={`text-[9px] text-gray-400 mb-1.5 truncate ${canEdit ? "pl-4" : ""}`}>{op.client_nombre}</p>}
      <div className={`flex items-center flex-wrap gap-1 ${canEdit ? "pl-4" : ""}`}>
        {fee > 0 && <span className="text-[10px] font-bold text-[#2E1A47] whitespace-nowrap">{fmtNum(fee)} €</span>}
        {op.importe && op.plazo_meses && (
          <span className="text-[9px] text-gray-400 whitespace-nowrap">
            {fmtNum(Number(op.importe) / op.plazo_meses)} €/mes
          </span>
        )}
        {op.facturacion_renting && (
          <span className={`text-[9px] font-bold px-1 py-0.5 uppercase ${op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"}`}>
            {op.facturacion_renting === "begreat" ? "BG" : "Fin"}
          </span>
        )}
        {op.status === "pendiente_de_validar" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
      </div>
    </div>
  );
}

function DraggableCard({ op, isDragging }: { op: Op; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: op.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const accent = FASE_ACCENT[op.fase] ?? "border-l-[#2E1A47]";
  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-gray-200 transition-all ${isDragging ? "opacity-40" : ""}`}>
      <CardContent op={op} dragListeners={listeners} dragAttributes={attributes} canEdit />
    </div>
  );
}

function DroppableColumn({ fase, ops, activeId, canEdit }: { fase: string; ops: Op[]; activeId: string | null; canEdit: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: fase, disabled: !canEdit });
  const accent = FASE_ACCENT[fase] ?? "border-l-[#2E1A47]";
  const bar = FASE_BAR[fase] ?? "bg-[#2E1A47]";
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  return (
    <div ref={setNodeRef} className={`flex flex-col transition-colors relative overflow-hidden ${isOver ? "bg-[#EEEBF3]/50" : "bg-[#fafafa]"}`}>
      <div className={`h-[3px] w-full flex-shrink-0 ${bar}`} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/begreat-logo-blanco.png" alt="" className="w-24 object-contain select-none" style={{ opacity: 0.055, filter: "invert(1) brightness(0.3)" }} />
      </div>
      <div className="px-3 py-3 border-b border-gray-200">
        <p className="text-[9px] font-black text-[#2E1A47] uppercase tracking-widest leading-tight mb-2">{fase}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-white bg-[#2E1A47] px-2 py-0.5 min-w-[20px] text-center">{ops.length}</span>
          {totalImporte > 0 && <span className="text-[10px] text-gray-500 font-semibold">{fmtNum(totalImporte)} €</span>}
        </div>
      </div>
      <div className="flex-1 space-y-2 min-h-[640px] px-1.5 pt-2 pb-3">
        {ops.map(op => canEdit
          ? <DraggableCard key={op.id} op={op} isDragging={activeId === op.id} />
          : (
            <Link key={op.id} href={`/portal/operaciones/${op.id}`}
              className={`block bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-[#2E1A47]/30 transition-all`}>
              <CardContent op={op} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}

export default function PortalKanbanRenting({ ops: initialOps, fases, canEdit = false }: { ops: Op[]; fases: string[]; canEdit?: boolean }) {
  const [ops, setOps] = useState(initialOps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeOp = ops.find(o => o.id === activeId) ?? null;

  const pendientes = ops.filter(o => o.status === "pendiente_de_validar");
  const totalFeeColab = ops.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const opId = String(active.id);
    const newFase = String(over.id);
    const op = ops.find(o => o.id === opId);
    if (!op || op.fase === newFase) return;
    setOps(prev => prev.map(o => o.id === opId ? { ...o, fase: newFase } : o));
    try {
      await fetch(`/api/operations/${opId}/fase`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fase: newFase }) });
    } catch {
      setOps(prev => prev.map(o => o.id === opId ? { ...o, fase: op.fase } : o));
    }
  }

  const opsByFase = fases.reduce<Record<string, Op[]>>((acc, f) => {
    acc[f] = ops.filter(o => o.fase === f);
    return acc;
  }, {});

  const board = (
    <div style={{ zoom: 0.9 }} className="flex pb-4 gap-0 border border-gray-200 bg-[#f8f7fb] overflow-hidden">
      {fases.map((fase, i) => (
        <div key={fase} className="flex items-stretch flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <DroppableColumn fase={fase} ops={opsByFase[fase] ?? []} activeId={activeId} canEdit={canEdit} />
          </div>
          {i < fases.length - 1 && (
            <div className="flex-shrink-0 self-stretch flex items-center justify-center w-5 relative z-10">
              <div className="absolute inset-y-0 left-0 w-px bg-gray-200" />
              <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                <path d="M1 0 L9 9 L1 18" stroke="#2E1A47" strokeOpacity="0.25" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Renting de equipos</h2>
        <div className="flex items-center gap-5 mt-1.5">
          {totalFeeColab > 0 && (
            <span className="text-xs text-gray-500">Mi fee: <span className="font-bold text-[#2E1A47]">{fmtNum(totalFeeColab)} €</span></span>
          )}
          <span className="text-xs text-gray-400">{ops.length} operaciones</span>
          {canEdit && <span className="text-[10px] text-gray-400 italic">Arrastra las tarjetas para cambiar de fase</span>}
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-amber-700 font-semibold">
            {pendientes.length} operación{pendientes.length !== 1 ? "es" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de validar por BeGreat
          </p>
        </div>
      )}

      {canEdit ? (
        <DndContext sensors={sensors} onDragStart={e => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
          {board}
          <DragOverlay>
            {activeOp && (
              <div className={`bg-white border border-gray-100 border-l-[3px] ${FASE_ACCENT[activeOp.fase] ?? "border-l-[#2E1A47]"} shadow-xl w-[200px]`}>
                <CardContent op={activeOp} canEdit />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : board}
    </div>
  );
}
