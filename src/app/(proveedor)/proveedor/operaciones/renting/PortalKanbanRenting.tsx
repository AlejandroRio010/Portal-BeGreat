"use client";

import { useState } from "react";
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
  modalidad_renting: string | null;
  importe_facturado_begreat: string | null;
  importe_facturado_visible: boolean;
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
const FASE_BAR: Record<string, string> = {
  "Pre-análisis":           "bg-gray-300",
  "En estudio por entidad": "bg-amber-400",
  "Operación aprobada":     "bg-blue-400",
  "Condiciones aceptadas":  "bg-indigo-400",
  "Contrato firmado":       "bg-violet-500",
  "Transferencia realizada":"bg-emerald-500",
};

function CardContent({ op }: { op: Op }) {
  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
  const importe = Number(op.importe ?? 0);
  const importeFacturado = Number(op.importe_facturado_begreat ?? 0);
  const bgFactura = op.modalidad_renting === "begreat_factura" || op.modalidad_renting === "begreat_factura_comisiona";
  return (
    <div className="p-3 pt-2.5">
      <div className="flex items-start gap-1 mb-1.5">
        <Link href={`/proveedor/operaciones/${op.id}`} className="text-[11px] font-semibold text-gray-800 hover:text-[#2E1A47] leading-tight line-clamp-2 flex-1">
          {displayName}
        </Link>
      </div>
      {op.client_nombre && op.nombre && <p className="text-[9px] text-gray-400 mb-1.5 truncate">{op.client_nombre}</p>}
      <div className="flex flex-col gap-0.5">
        {importe > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="text-[8px] text-gray-400 uppercase">Importe</span>
            <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">{fmtNum(importe)} €</span>
          </div>
        )}
        {bgFactura && importeFacturado > 0 && op.importe_facturado_visible && (
          <div className="flex items-baseline gap-1">
            <span className="text-[8px] text-gray-400 uppercase">BG factura</span>
            <span className="text-[10px] text-gray-600 font-semibold whitespace-nowrap">{fmtNum(importeFacturado)} €</span>
          </div>
        )}
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

function Column({ fase, ops }: { fase: string; ops: Op[] }) {
  const accent = FASE_ACCENT[fase] ?? "border-l-[#2E1A47]";
  const bar = FASE_BAR[fase] ?? "bg-[#2E1A47]";
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  return (
    <div className="flex flex-col transition-colors relative overflow-hidden bg-[#fafafa]">
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
        {ops.map(op => (
          <Link key={op.id} href={`/proveedor/operaciones/${op.id}`}
            className={`block bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-[#2E1A47]/30 transition-all`}>
            <CardContent op={op} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PortalKanbanRenting({ ops: initialOps, fases, canEdit = false }: { ops: Op[]; fases: string[]; canEdit?: boolean }) {
  const [ops] = useState(initialOps);

  const pendientes = ops.filter(o => o.status === "pendiente_de_validar");
  const totalImporte = ops.reduce((s, o) => s + Number(o.importe ?? 0), 0);

  const opsByFase = fases.reduce<Record<string, Op[]>>((acc, f) => {
    acc[f] = ops.filter(o => o.fase === f);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Renting de equipos</h2>
        <div className="flex items-center gap-5 mt-1.5">
          {totalImporte > 0 && (
            <span className="text-xs text-gray-500">Importe total: <span className="font-bold text-[#2E1A47]">{fmtNum(totalImporte)} €</span></span>
          )}
          <span className="text-xs text-gray-400">{ops.length} operaciones</span>
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

      <div style={{ zoom: 0.9 }} className="flex pb-4 gap-0 border border-gray-200 bg-[#f8f7fb] overflow-hidden">
        {fases.map((fase, i) => (
          <div key={fase} className="flex items-stretch flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <Column fase={fase} ops={opsByFase[fase] ?? []} />
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
    </div>
  );
}
