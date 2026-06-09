"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtEur } from "@/lib/format";

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export interface HistOp {
  id: string;
  nombre: string | null;
  client_nombre: string | null;
  pipeline_key: string;
  fase: string | null;
  status: string;
  fecha_cierre: string | Date | null;
  created_at: string | Date;
  comision_colaborador: string | null;
  comision_begreat: string | null;
  colaborador_nombre?: string | null;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function HistorialTabla({ ops, esAdmin, hrefBase }: { ops: HistOp[]; esAdmin: boolean; hrefBase: string }) {
  const [q, setQ] = useState("");
  const ql = q.toLowerCase().trim();
  const filtered = ql
    ? ops.filter(o => (o.nombre ?? "").toLowerCase().includes(ql) || (o.client_nombre ?? "").toLowerCase().includes(ql) || (o.colaborador_nombre ?? "").toLowerCase().includes(ql))
    : ops;

  return (
    <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por operación o cliente..."
          className="flex-1 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-gray-50"
        />
        <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">{filtered.length} operación{filtered.length !== 1 ? "es" : ""}</p>
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center"><p className="text-gray-400 text-sm">No hay operaciones con los filtros aplicados.</p></div>
      ) : (
        <div style={{ zoom: 0.85 }}>
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente / Operación</th>
                {esAdmin && <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>}
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha cierre</th>
                {esAdmin && <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee BeGreat</th>}
                <th className="text-left px-6 py-3.5 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">{esAdmin ? "Fee Colab." : "Comisión"}</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((op) => {
                const esFirmada = FIRMADAS.includes(op.fase ?? "");
                const badge = op.status === "pendiente_de_validar"
                  ? { c: "bg-amber-50 border border-amber-200 text-amber-700", l: "Pendiente" }
                  : esFirmada ? { c: "bg-emerald-50 border border-emerald-200 text-emerald-700", l: "Firmada ✓" }
                  : op.status === "archivada" ? { c: "bg-red-50 border border-red-200 text-red-600", l: "Denegada" }
                  : { c: "bg-blue-50 border border-blue-200 text-blue-700", l: "En estudio" };
                return (
                  <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{op.nombre ?? op.client_nombre ?? "—"}</p>
                      {op.client_nombre && <p className="text-xs text-gray-400 mt-0.5">{op.client_nombre}</p>}
                    </td>
                    {esAdmin && <td className="px-6 py-4 text-sm text-gray-600">{op.colaborador_nombre ?? "—"}</td>}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold ${op.pipeline_key === "consultoria" ? "bg-[#EEEBF3] text-[#2E1A47]" : "bg-blue-50 text-blue-700"}`}>
                        {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${badge.c}`}>{badge.l}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(op.fecha_cierre ?? op.created_at)}</td>
                    {esAdmin && <td className="px-6 py-4 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.comision_begreat)}</td>}
                    <td className="px-6 py-4 text-sm font-bold text-[#2E1A47] whitespace-nowrap">{fmtEur(op.comision_colaborador)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`${hrefBase}/${op.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
