"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import Link from "next/link";
import { fmtNum } from "@/lib/format";

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
  modalidad_renting: string | null;
  importe_facturado_begreat: string | null;
}

const FASE_ACCENT: Record<string, string> = {
  "Pre-análisis":           "border-l-gray-300",
  "En estudio por entidad": "border-l-amber-400",
  "Operación aprobada":     "border-l-blue-400",
  "Condiciones aceptadas":  "border-l-indigo-400",
  "Contrato firmado":       "border-l-violet-500",
  "Transferencia realizada":"border-l-emerald-500",
};
const FASE_BAR: Record<string, string> = {
  "Pre-análisis":           "bg-gray-300",
  "En estudio por entidad": "bg-amber-400",
  "Operación aprobada":     "bg-blue-400",
  "Condiciones aceptadas":  "bg-indigo-400",
  "Contrato firmado":       "bg-violet-500",
  "Transferencia realizada":"bg-emerald-500",
};

function DroppableColumn({ fase, ops, activeId }: { fase: string; ops: KanbanOp[]; activeId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: fase });
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
        <p className="text-[9px] font-black text-[#2E1A47] uppercase tracking-widest leading-tight truncate mb-2">{fase}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-white bg-[#2E1A47] px-2 py-0.5 min-w-[20px] text-center">{ops.length}</span>
          {totalImporte > 0 && <span className="text-[10px] text-gray-500 font-semibold">{fmtNum(totalImporte)} €</span>}
        </div>
      </div>
      <div className="flex-1 space-y-2 min-h-[640px] px-1.5 pt-2 pb-3">
        {ops.map((op) => (
          <DraggableCard key={op.id} op={op} isDragging={activeId === op.id} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ op, isDragging }: { op: KanbanOp; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: op.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const accent = FASE_ACCENT[op.fase] ?? "border-l-[#2E1A47]";
  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-gray-200 transition-all ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent op={op} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

export function CardContent({ op, dragListeners, dragAttributes }: { op: KanbanOp; dragListeners?: any; dragAttributes?: any }) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  const importe = Number(op.importe ?? 0);
  const importeFacturado = Number(op.importe_facturado_begreat ?? 0);
  const bgFactura = op.modalidad_renting === "begreat_factura" || op.modalidad_renting === "begreat_factura_comisiona";
  const fee = Number(op.comision_begreat ?? 0);
  return (
    <div className="p-3 pt-2.5">
      <div className="flex items-start gap-1 mb-1.5">
        <button {...dragListeners} {...dragAttributes} className="mt-0.5 flex-shrink-0 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none" tabIndex={-1}>
          <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
            <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
            <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
          </svg>
        </button>
        <Link href={`/admin/operaciones/${op.id}`} className="text-[11px] font-semibold text-gray-800 hover:text-[#2E1A47] leading-tight line-clamp-2 flex-1">
          {displayName}
        </Link>
      </div>
      {op.colaborador_nombre && <p className="text-[9px] text-gray-400 pl-4 mb-1.5 truncate">{op.colaborador_nombre}</p>}
      <div className="pl-4 flex flex-col gap-0.5">
        {bgFactura && importeFacturado > 0 ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-[8px] text-gray-400 uppercase">BG factura</span>
              <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">{fmtNum(importeFacturado)} €</span>
            </div>
            {importe > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-[8px] text-gray-400 uppercase">Proveedor</span>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{fmtNum(importe)} €</span>
              </div>
            )}
          </>
        ) : importe > 0 ? (
          <div className="flex items-baseline gap-1">
            <span className="text-[8px] text-gray-400 uppercase">Importe</span>
            <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">{fmtNum(importe)} €</span>
          </div>
        ) : null}
        {fee > 0 && <span className="text-[9px] text-[#2E1A47] font-semibold whitespace-nowrap">Fee: {fmtNum(fee)} €</span>}
        <div className="flex items-center gap-1">
          {op.facturacion_renting && (
            <span className={`text-[9px] font-bold px-1 py-0.5 uppercase ${op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"}`}>
              {op.facturacion_renting === "begreat" ? "BG" : "Fin"}
            </span>
          )}
          {op.status === "pendiente_de_validar" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialOps, fases }: { initialOps: KanbanOp[]; fases: string[] }) {
  const [ops, setOps] = useState(initialOps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeOp = ops.find((o) => o.id === activeId) ?? null;

  const totalFeeBegreat = ops.reduce((s, o) => s + Number(o.comision_begreat ?? 0), 0);
  const totalFeeColab   = ops.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

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

  const opsByFase = fases.reduce<Record<string, KanbanOp[]>>((acc, f) => {
    acc[f] = ops.filter((o) => o.fase === f);
    return acc;
  }, {});

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Renting de equipos</h2>
        <div className="flex items-center gap-5 mt-1.5">
          {totalFeeBegreat > 0 && (
            <span className="text-xs text-gray-500">Fee BeGreat: <span className="font-bold text-[#2E1A47]">{fmtNum(totalFeeBegreat)} €</span></span>
          )}
          {totalFeeColab > 0 && (
            <span className="text-xs text-gray-500">Fee colaboradores: <span className="font-bold text-[#2E1A47]">{fmtNum(totalFeeColab)} €</span></span>
          )}
          <span className="text-xs text-gray-400">{ops.length} operaciones</span>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
        <div style={{ zoom: 0.9 }} className="flex pb-4 gap-0 border border-gray-200 bg-[#f8f7fb] overflow-hidden">
          {fases.map((fase, i) => (
            <div key={fase} className="flex items-stretch flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <DroppableColumn fase={fase} ops={opsByFase[fase] ?? []} activeId={activeId} />
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
        <DragOverlay>
          {activeOp && (
            <div className={`bg-white border border-gray-100 border-l-[3px] ${FASE_ACCENT[activeOp.fase] ?? "border-l-[#2E1A47]"} shadow-xl w-[200px]`}>
              <CardContent op={activeOp} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
