"use client";

import { useState, useMemo } from "react";

interface OpData {
  colaborador_id: string | null;
  colaborador_nombre: string | null;
  fase: string | null;
  comision_colaborador: string | null;
  comision_begreat: string | null;
  created_at: string;
}

const FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

type Periodo = "todos" | "anual" | "q1" | "q2" | "q3" | "q4";

const PERIODO_LABELS: Record<Periodo, string> = {
  todos: "Todo",
  anual: "Año",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
};

const Q_MONTHS: Record<string, number[]> = {
  q1: [0, 1, 2],
  q2: [3, 4, 5],
  q3: [6, 7, 8],
  q4: [9, 10, 11],
};

function fmtEur(v: number): string {
  if (!v) return "—";
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function RankingColaboradores({ ops }: { ops: OpData[] }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const s = new Set(ops.map(o => new Date(o.created_at).getFullYear()));
    return Array.from(s).sort((a, b) => b - a);
  }, [ops]);

  const [year, setYear] = useState(years[0] ?? currentYear);
  const [periodo, setPeriodo] = useState<Periodo>("anual");

  const ranking = useMemo(() => {
    const filtered = ops.filter(op => {
      if (periodo === "todos") return true;
      const d = new Date(op.created_at);
      if (d.getFullYear() !== year) return false;
      if (periodo === "anual") return true;
      return Q_MONTHS[periodo]?.includes(d.getMonth());
    });

    const map = new Map<string, { nombre: string; ops: number; aprobadas: number; feeColab: number; feeBegreat: number }>();
    for (const op of filtered) {
      if (!op.colaborador_id) continue;
      const entry = map.get(op.colaborador_id) ?? { nombre: op.colaborador_nombre ?? "—", ops: 0, aprobadas: 0, feeColab: 0, feeBegreat: 0 };
      entry.ops += 1;
      if (FIRMADAS.includes(op.fase ?? "")) {
        entry.aprobadas += 1;
        entry.feeColab += Number(op.comision_colaborador ?? 0);
        entry.feeBegreat += Number(op.comision_begreat ?? 0);
      }
      map.set(op.colaborador_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.feeBegreat - a.feeBegreat).slice(0, 15);
  }, [ops, year, periodo]);

  return (
    <div className="bg-white border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Ranking de colaboradores</p>
        <div className="flex items-center gap-2">
          {periodo !== "todos" && (
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-200 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#2E1A47]">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <div className="flex border border-gray-200">
            {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
              <button key={p} type="button" onClick={() => setPeriodo(p)}
                className={`px-2.5 py-1 text-[10px] font-semibold transition-all ${periodo === p ? "bg-[#2E1A47] text-white" : "bg-white text-gray-500 hover:bg-gray-50"} ${p !== "todos" ? "border-l border-gray-200" : ""}`}>
                {PERIODO_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
      {ranking.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-gray-300">Sin datos.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-[#EEEBF3] border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Ops enviadas</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Aprobadas</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee colaborador</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fee BeGreat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ranking.map((c, i) => (
              <tr key={i} className="hover:bg-[#EEEBF3]/30 transition-colors">
                <td className="px-6 py-3 text-xs font-bold text-gray-400">{i + 1}</td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.nombre}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{c.ops}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{c.aprobadas}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{fmtEur(c.feeColab)}</td>
                <td className="px-6 py-3 text-sm font-bold text-[#2E1A47]">{fmtEur(c.feeBegreat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
