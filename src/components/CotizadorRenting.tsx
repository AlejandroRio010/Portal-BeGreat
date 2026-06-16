"use client";

import { useState, useEffect } from "react";

type Entidad = "grenke" | "laboral_kutxa";

const ENTIDADES: { id: Entidad; nombre: string }[] = [
  { id: "grenke", nombre: "Grenke" },
  { id: "laboral_kutxa", nombre: "Laboral Kutxa" },
];

const FALLBACK_PLAZOS: Record<Entidad, { meses: number; tae: number }[]> = {
  grenke: [
    { meses: 24, tae: 0.226 },
    { meses: 36, tae: 0.200 },
    { meses: 48, tae: 0.171 },
    { meses: 60, tae: 0.161 },
    { meses: 72, tae: 0.148 },
  ],
  laboral_kutxa: [
    { meses: 24, tae: 0.128 },
    { meses: 36, tae: 0.118 },
    { meses: 48, tae: 0.110 },
    { meses: 60, tae: 0.105 },
    { meses: 72, tae: 0.098 },
  ],
};

function calcularCuota(importe: number, meses: number, tae: number) {
  const r = tae / 12;
  return importe * (r / (1 - Math.pow(1 + r, -meses)));
}

export default function CotizadorRenting() {
  const [cotImporte, setCotImporte] = useState("");
  const [entidad, setEntidad] = useState<Entidad>("grenke");
  const [resultados, setResultados] = useState<{ plazo: number; cuota: number }[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [dynamicTaes, setDynamicTaes] = useState<Record<string, { meses: number; tae: number }[]> | null>(null);

  useEffect(() => {
    fetch("/api/cotizador").then(r => r.ok ? r.json() : null).then(d => { if (d) setDynamicTaes(d); });
  }, []);

  function calcular(ent?: Entidad) {
    const val = parseFloat(cotImporte.replace(",", "."));
    if (!val || val <= 0) return;
    const e = ent ?? entidad;
    const plazos = dynamicTaes?.[e] ?? FALLBACK_PLAZOS[e];
    const res = plazos.map(p => ({ plazo: p.meses, cuota: calcularCuota(val, p.meses, p.tae) }));
    setResultados(res);
    if (!seleccionado || !res.find(r => r.plazo === seleccionado)) setSeleccionado(48);
  }

  const cuotaSel = resultados?.find(r => r.plazo === seleccionado);
  const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div className="grid grid-cols-[1fr_280px] gap-0">
        <div className="bg-[#2E1A47] p-6">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Cálculo basado en importe de factura (neto)</p>

          <div className="flex gap-2 mb-4">
            {ENTIDADES.map(e => (
              <button key={e.id} type="button"
                onClick={() => { setEntidad(e.id); if (resultados) calcular(e.id); }}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${entidad === e.id ? "bg-white text-[#2E1A47] border-white" : "bg-transparent text-white/60 border-white/30 hover:border-white/60"}`}>
                {e.nombre}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-end mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Importe de factura (neto)</label>
              <input value={cotImporte} onChange={e => setCotImporte(e.target.value)}
                type="number" step="any" inputMode="decimal"
                className="w-full px-4 py-3 bg-white text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-white/40"
                placeholder="10.000,00 €" />
            </div>
            <button type="button" onClick={() => calcular()}
              className="px-6 py-3 bg-white/20 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/30 transition-colors whitespace-nowrap border border-white/30">
              Calcular
            </button>
          </div>

          {resultados && (
            <div>
              <div className="flex border-b border-white/20 pb-2 mb-1">
                <p className="flex-1 text-[10px] font-bold text-white/50 uppercase tracking-wider">Plazo</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Cuota/mes</p>
              </div>
              <div className="divide-y divide-white/10">
                {resultados.map(r => (
                  <label key={r.plazo}
                    className={`flex items-center py-3 cursor-pointer transition-all group ${seleccionado === r.plazo ? "bg-white/10 -mx-3 px-3" : "hover:bg-white/5 -mx-3 px-3"}`}>
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
                      {fmt(r.cuota)} €
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#1a0f2e] flex flex-col">
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">Cuota estimada</p>
            {cuotaSel ? (
              <>
                <p className="text-4xl font-black text-white mb-1">{fmt(cuotaSel.cuota)} €</p>
                <p className="text-white/40 text-xs">Valor neto al mes durante<br />{cuotaSel.plazo} meses</p>
              </>
            ) : (
              <p className="text-white/20 text-sm">Introduce un importe y pulsa calcular</p>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs font-bold text-[#2E1A47] mt-4 leading-relaxed">* Cuota provisional sujeta a la aprobación del estudio crediticio del cliente, la elegibilidad de los activos por parte de la entidad financiera y las condiciones vigentes en el momento de la formalización. BeGreat Consulting no garantiza la cuota indicada ni la aprobación de la operación.</p>
    </div>
  );
}
