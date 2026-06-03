"use client";

import Link from "next/link";

interface Op {
  id: string;
  nombre: string | null;
  client_nombre: string | null;
  fase: string;
  status: string;
  importe: string | null;
  comision_colaborador: string | null;
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

export default function PortalKanbanRenting({ ops, fases }: { ops: Op[]; fases: string[] }) {
  const opsByFase = fases.reduce<Record<string, Op[]>>((acc, f) => {
    acc[f] = ops.filter((o) => o.fase === f);
    return acc;
  }, {});
  const pendientes    = ops.filter((o) => o.status === "pendiente_de_validar");
  const totalFeeColab = ops.reduce((s, o) => s + Number(o.comision_colaborador ?? 0), 0);

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-widest">Renting de equipos</h2>
        <div className="flex items-center gap-5 mt-1.5">
          {totalFeeColab > 0 && (
            <span className="text-xs text-gray-500">Mi fee: <span className="font-bold text-[#2E1A47]">{totalFeeColab.toLocaleString("es-ES")} €</span></span>
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

      <div className="flex overflow-x-auto pb-4">
        {fases.map((fase, i) => {
          const colOps = opsByFase[fase] ?? [];
          const dot    = FASE_DOT[fase] ?? "bg-[#2E1A47]";
          const accent = FASE_ACCENT[fase] ?? "border-l-[#2E1A47]";
          const totalImporte = colOps.reduce((s, o) => s + Number(o.importe ?? 0), 0);

          return (
            <div key={fase} className="flex flex-shrink-0 items-stretch">
              {i > 0 && <div className="w-px bg-[#2E1A47]/15 self-stretch mx-1" />}
              <div className="flex-shrink-0 w-[200px] flex flex-col">
                <div className="px-2 py-3 mb-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <p className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-widest leading-tight truncate">{fase}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pl-4">
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">{colOps.length}</span>
                    {totalImporte > 0 && <span className="text-[9px] text-gray-400">{totalImporte.toLocaleString("es-ES")} €</span>}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 min-h-[300px] px-1">
                  {colOps.map((op) => {
                    const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
                    const fee = Number(op.comision_colaborador ?? 0);
                    return (
                      <Link key={op.id} href={`/portal/operaciones/${op.id}`}
                        className={`block bg-white border border-gray-100 border-l-[3px] ${accent} shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-2.5`}
                      >
                        <p className="text-[11px] font-semibold text-gray-800 hover:text-[#2E1A47] leading-tight line-clamp-2 mb-1.5">{displayName}</p>
                        {op.client_nombre && op.nombre && (
                          <p className="text-[9px] text-gray-400 mb-1.5 truncate">{op.client_nombre}</p>
                        )}
                        <div className="flex items-center flex-wrap gap-1">
                          {fee > 0 && <span className="text-[10px] font-bold text-[#2E1A47] whitespace-nowrap">{fee.toLocaleString("es-ES")} €</span>}
                          {op.facturacion_renting && (
                            <span className={`text-[9px] font-bold px-1 py-0.5 uppercase ${op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"}`}>
                              {op.facturacion_renting === "begreat" ? "BG" : "Fin"}
                            </span>
                          )}
                          {op.status === "pendiente_de_validar" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
