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

const FASE_COLORS: Record<string, { dot: string; top: string }> = {
  "Pre-análisis":           { dot: "bg-gray-400",    top: "border-t-gray-300" },
  "En estudio por entidad": { dot: "bg-amber-400",   top: "border-t-amber-400" },
  "Operación aprobada":     { dot: "bg-blue-400",    top: "border-t-blue-400" },
  "Condiciones aceptadas":  { dot: "bg-indigo-400",  top: "border-t-indigo-400" },
  "Contrato firmado":       { dot: "bg-violet-500",  top: "border-t-violet-500" },
  "Transferencia realizada":{ dot: "bg-emerald-500", top: "border-t-emerald-500" },
};

export default function PortalKanbanRenting({ ops, fases }: { ops: Op[]; fases: string[] }) {
  const opsByFase = fases.reduce<Record<string, Op[]>>((acc, f) => {
    acc[f] = ops.filter((o) => o.fase === f);
    return acc;
  }, {});
  const pendientes = ops.filter((o) => o.status === "pendiente_de_validar");

  return (
    <div>
      {pendientes.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-amber-700 font-semibold">
            {pendientes.length} operación{pendientes.length !== 1 ? "es" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de validar por BeGreat
          </p>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {fases.map((fase) => {
          const colOps = opsByFase[fase] ?? [];
          const colors = FASE_COLORS[fase] ?? { dot: "bg-[#2E1A47]", top: "border-t-[#2E1A47]" };
          const totalImporte = colOps.reduce((s, o) => s + Number(o.importe ?? 0), 0);

          return (
            <div key={fase} className={`flex-shrink-0 w-56 flex flex-col border-t-[3px] ${colors.top} bg-[#f3f2f7]`}>
              <div className="px-3 pt-3 pb-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <p className="text-[11px] font-bold text-[#2E1A47] uppercase tracking-wider leading-tight">{fase}</p>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-[10px] text-gray-400 font-semibold">{colOps.length} op{colOps.length !== 1 ? "s" : ""}</span>
                  {totalImporte > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] text-gray-500 font-semibold">{totalImporte.toLocaleString("es-ES")} €</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 px-2 pb-3 space-y-2 min-h-[260px]">
                {colOps.map((op) => {
                  const displayName = op.nombre ?? op.client_nombre ?? "Sin nombre";
                  const fee = Number(op.comision_colaborador ?? 0);
                  return (
                    <Link
                      key={op.id}
                      href={`/portal/operaciones/${op.id}`}
                      className="block bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-[#2E1A47]/40 transition-all p-2.5 group"
                    >
                      <p className="text-[12px] font-semibold text-gray-900 group-hover:text-[#2E1A47] leading-tight line-clamp-2 mb-1.5">
                        {displayName}
                      </p>
                      {op.client_nombre && op.nombre && (
                        <p className="text-[10px] text-gray-400 mb-1 truncate">{op.client_nombre}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {fee > 0 && (
                          <span className="text-[11px] font-bold text-[#2E1A47] whitespace-nowrap">{fee.toLocaleString("es-ES")} €</span>
                        )}
                        {op.facturacion_renting && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase ${op.facturacion_renting === "begreat" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-amber-50 text-amber-700"}`}>
                            {op.facturacion_renting === "begreat" ? "BeGreat" : "Financiera"}
                          </span>
                        )}
                        {op.status === "pendiente_de_validar" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 uppercase">Pendiente</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
