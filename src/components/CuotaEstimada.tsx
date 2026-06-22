"use client";

import { useState, useEffect, useMemo } from "react";

const FALLBACK = [
  { meses: 24, taeMin: 0.105, taeMax: 0.228 },
  { meses: 36, taeMin: 0.100, taeMax: 0.2017 },
  { meses: 48, taeMin: 0.0957, taeMax: 0.1734 },
  { meses: 60, taeMin: 0.0983, taeMax: 0.1684 },
  { meses: 72, taeMin: 0.095, taeMax: 0.1475 },
];

function calcularCuota(importe: number, meses: number, tae: number) {
  const r = tae / 12;
  return importe * (r / (1 - Math.pow(1 + r, -meses)));
}

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CuotaEstimada({ importe, plazo }: { importe: string; plazo: number | null }) {
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
    });
  }, []);

  const resultado = useMemo(() => {
    const val = parseFloat(importe.replace(/\./g, "").replace(",", ".")) || 0;
    if (val <= 0 || !plazo) return null;
    const rango = rangos.find(r => r.meses === plazo);
    if (!rango) return null;
    return {
      min: calcularCuota(val, plazo, rango.taeMin),
      max: calcularCuota(val, plazo, rango.taeMax),
    };
  }, [importe, plazo, rangos]);

  if (!resultado) return null;

  return (
    <div className="mt-2">
      <p className="text-xs text-[#2E1A47] bg-[#EEEBF3] px-3 py-2 font-medium">
        Cuota estimada: <span className="font-bold">{fmt(resultado.min)} – {fmt(resultado.max)} €/mes</span>
        <span className="text-[10px] text-gray-500 ml-1">(a {plazo} meses)*</span>
      </p>
      <p className="text-[9px] text-gray-400 leading-tight mt-1 px-1">* Cuota provisional sujeta a la aprobación del estudio crediticio del cliente, la elegibilidad de los activos por parte de la entidad financiera y las condiciones vigentes en el momento de la formalización. BeGreat Consulting no garantiza la cuota indicada ni la aprobación de la operación.</p>
    </div>
  );
}
