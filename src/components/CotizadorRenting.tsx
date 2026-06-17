"use client";

import { useState, useEffect } from "react";

const FALLBACK: { meses: number; taeMin: number; taeMax: number }[] = [
  { meses: 24, taeMin: 0.128, taeMax: 0.226 },
  { meses: 36, taeMin: 0.118, taeMax: 0.200 },
  { meses: 48, taeMin: 0.110, taeMax: 0.171 },
  { meses: 60, taeMin: 0.105, taeMax: 0.161 },
  { meses: 72, taeMin: 0.098, taeMax: 0.148 },
];

function calcularCuota(importe: number, meses: number, tae: number) {
  const r = tae / 12;
  return importe * (r / (1 - Math.pow(1 + r, -meses)));
}

type Rango = { plazo: number; cuotaMin: number; cuotaMax: number };

export default function CotizadorRenting() {
  const [cotImporte, setCotImporte] = useState("");
  const [resultados, setResultados] = useState<Rango[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [rangos, setRangos] = useState<{ meses: number; taeMin: number; taeMax: number }[]>(FALLBACK);

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
        if (taes.length === 0) {
          const fb = FALLBACK.find(f => f.meses === p)!;
          return fb;
        }
        return { meses: p, taeMin: Math.min(...taes), taeMax: Math.max(...taes) };
      });
      setRangos(merged);
    });
  }, []);

  function calcular() {
    const val = parseFloat(cotImporte.replace(",", "."));
    if (!val || val <= 0) return;
    const res = rangos.map(r => ({
      plazo: r.meses,
      cuotaMin: calcularCuota(val, r.meses, r.taeMin),
      cuotaMax: calcularCuota(val, r.meses, r.taeMax),
    }));
    setResultados(res);
    if (!seleccionado || !res.find(r => r.plazo === seleccionado)) setSeleccionado(48);
  }

  const sel = resultados?.find(r => r.plazo === seleccionado);
  const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="grid grid-cols-[1fr_300px] gap-0">
        <div className="bg-[#2E1A47] p-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Cálculo basado en importe de factura (neto)</p>

          <div className="flex gap-3 items-end mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Importe de factura (neto)</label>
              <input value={cotImporte} onChange={e => setCotImporte(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); calcular(); } }}
                type="number" step="any" inputMode="decimal"
                className="w-full px-4 py-3 bg-white text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-white/40"
                placeholder="10.000,00 €" />
            </div>
            <button type="button" onClick={calcular}
              className="px-6 py-3 bg-white/20 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/30 transition-colors whitespace-nowrap border border-white/30">
              Calcular
            </button>
          </div>

          {resultados && (
            <div>
              <div className="flex border-b border-white/20 pb-2 mb-1">
                <p className="flex-1 text-[10px] font-bold text-white/50 uppercase tracking-wider">Plazo</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Rango cuota/mes</p>
              </div>
              <div className="divide-y divide-white/10">
                {resultados.map(r => (
                  <label key={r.plazo}
                    className={`flex items-center py-3 cursor-pointer transition-all ${seleccionado === r.plazo ? "bg-white/10 -mx-3 px-3" : "hover:bg-white/5 -mx-3 px-3"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${seleccionado === r.plazo ? "border-white bg-white" : "border-white/40"}`}>
                      {seleccionado === r.plazo && <div className="w-2.5 h-2.5 rounded-full bg-[#2E1A47]" />}
                    </div>
                    <input type="radio" name="cot_plazo" className="sr-only"
                      checked={seleccionado === r.plazo}
                      onChange={() => setSeleccionado(r.plazo)} />
                    <span className={`flex-1 text-sm font-medium ${seleccionado === r.plazo ? "text-white" : "text-white/70"}`}>
                      {r.plazo} meses
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${seleccionado === r.plazo ? "text-white" : "text-white/70"}`}>
                      {fmt(r.cuotaMin)} – {fmt(r.cuotaMax)} €
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#1a0f2e] flex flex-col items-center justify-center text-center p-6">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">Rango estimado</p>
          {sel ? (
            <>
              <p className="text-3xl font-black text-white mb-0.5">{fmt(sel.cuotaMin)} €</p>
              <p className="text-white/40 text-xs font-bold my-1">—</p>
              <p className="text-3xl font-black text-white mb-2">{fmt(sel.cuotaMax)} €</p>
              <p className="text-white/40 text-xs">Valor neto al mes durante<br />{sel.plazo} meses</p>
            </>
          ) : (
            <p className="text-white/20 text-sm">Introduce un importe y pulsa calcular</p>
          )}
        </div>
      </div>
      <p className="text-xs font-bold text-[#2E1A47] mt-4 leading-relaxed">* Cuota provisional sujeta a la aprobación del estudio crediticio del cliente, la elegibilidad de los activos por parte de la entidad financiera y las condiciones vigentes en el momento de la formalización. BeGreat Consulting no garantiza la cuota indicada ni la aprobación de la operación.</p>
    </div>
  );
}
