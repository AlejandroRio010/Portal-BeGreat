"use client";

import { useState, useEffect } from "react";

const FALLBACK: { meses: number; taeMin: number; taeMax: number }[] = [
  { meses: 24, taeMin: 0.105, taeMax: 0.228 },
  { meses: 36, taeMin: 0.100, taeMax: 0.2017 },
  { meses: 48, taeMin: 0.0957, taeMax: 0.1734 },
  { meses: 60, taeMin: 0.0983, taeMax: 0.1684 },
  { meses: 72, taeMin: 0.095, taeMax: 0.1475 },
];

const PLAZOS_DEFAULT = [48, 60];
const IMPORTE_INICIAL = 10000;

function fmtInput(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseInput(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function calcularCuota(importe: number, meses: number, tae: number) {
  const r = tae / 12;
  return importe * (r / (1 - Math.pow(1 + r, -meses)));
}

type Rango = { plazo: number; cuotaMin: number; cuotaMax: number };

function calcResultados(rangos: { meses: number; taeMin: number; taeMax: number }[], importe: number): Rango[] {
  return rangos.map(r => ({
    plazo: r.meses,
    cuotaMin: calcularCuota(importe, r.meses, r.taeMin),
    cuotaMax: calcularCuota(importe, r.meses, r.taeMax),
  }));
}

export default function CotizadorRenting() {
  const [cotImporte, setCotImporte] = useState(fmtInput(IMPORTE_INICIAL));
  const [resultados, setResultados] = useState<Rango[]>(calcResultados(FALLBACK, IMPORTE_INICIAL));
  const [seleccionado, setSeleccionado] = useState<number>(48);
  const [expanded, setExpanded] = useState(false);
  const [rangos, setRangos] = useState(FALLBACK);

  useEffect(() => {
    fetch("/api/cotizador").then(r => r.ok ? r.json() : null).then((data: Record<string, { meses: number; tae: number }[]> | null) => {
      if (!data) return;
      const plazos = [24, 36, 48, 60, 72];
      const merged = plazos.map(p => {
        const taes: number[] = [];
        for (const ent of Object.values(data)) {
          const entry = ent.find(e => e.meses === p);
          if (entry) taes.push(entry.tae);
        }
        if (taes.length === 0) return FALLBACK.find(f => f.meses === p)!;
        return { meses: p, taeMin: Math.min(...taes), taeMax: Math.max(...taes) };
      });
      setRangos(merged);
      setResultados(calcResultados(merged, parseInput(cotImporte) || IMPORTE_INICIAL));
    });
  }, []);

  function calcular() {
    const val = parseInput(cotImporte);
    if (!val || val <= 0) return;
    setCotImporte(fmtInput(val));
    setResultados(calcResultados(rangos, val));
  }

  const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const plazosVisibles = expanded ? rangos.map(r => r.meses) : PLAZOS_DEFAULT;

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="bg-[#2E1A47]">
        <div className="p-6 pb-4">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Importe de factura (neto)</p>
          <div className="flex gap-3">
            <input value={cotImporte} onChange={e => setCotImporte(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); calcular(); } }}
              onBlur={calcular}
              type="text" inputMode="decimal"
              className="flex-1 px-4 py-3 bg-white text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="10.000,00 €" />
            <button type="button" onClick={calcular}
              className="px-8 py-3 bg-white/20 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/30 transition-colors whitespace-nowrap border border-white/30">
              Calcular
            </button>
          </div>
        </div>

        <div className="px-6 pb-2">
          <div className="flex border-b border-white/20 pb-2 mb-1">
            <p className="flex-1 text-[10px] font-bold text-white/50 uppercase tracking-wider">Plazo</p>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Cuota estimada / mes</p>
          </div>
          <div className="divide-y divide-white/10">
            {plazosVisibles.map(p => {
              const r = resultados.find(x => x.plazo === p);
              return (
                <label key={p}
                  className={`flex items-center py-3.5 cursor-pointer transition-all ${seleccionado === p ? "bg-white/10 -mx-3 px-3" : "hover:bg-white/5 -mx-3 px-3"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${seleccionado === p ? "border-white bg-white" : "border-white/40"}`}>
                    {seleccionado === p && <div className="w-2.5 h-2.5 rounded-full bg-[#2E1A47]" />}
                  </div>
                  <input type="radio" name="cot_plazo" className="sr-only"
                    checked={seleccionado === p}
                    onChange={() => setSeleccionado(p)} />
                  <span className={`flex-1 text-sm font-medium ${seleccionado === p ? "text-white" : "text-white/70"}`}>
                    {p} meses
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${seleccionado === p ? "text-white" : "text-white/70"}`}>
                    {r ? `${fmt(r.cuotaMin)} – ${fmt(r.cuotaMax)} €` : "— €"}
                  </span>
                </label>
              );
            })}
          </div>

          <button type="button" onClick={() => setExpanded(!expanded)}
            className="w-full py-3 flex items-center justify-center gap-1.5 text-white/40 hover:text-white/70 transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider">{expanded ? "Ver menos" : "Ver todos los plazos"}</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-xs font-bold text-[#2E1A47] mt-4 leading-relaxed">* Cuota provisional sujeta a la aprobación del estudio crediticio del cliente, la elegibilidad de los activos por parte de la entidad financiera y las condiciones vigentes en el momento de la formalización. BeGreat Consulting no garantiza la cuota indicada ni la aprobación de la operación.</p>
    </div>
  );
}
