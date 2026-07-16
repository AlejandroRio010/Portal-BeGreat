// Cálculo de la cuota aproximada de renting (mismo motor que el cotizador).
// cuota = importe · r / (1 − (1+r)^−meses), con r = TAE/12.
// El rango sale de las TAEs mín/máx del mercado por plazo.

const TAE_RANGES: { meses: number; taeMin: number; taeMax: number }[] = [
  { meses: 24, taeMin: 0.105, taeMax: 0.228 },
  { meses: 36, taeMin: 0.100, taeMax: 0.2017 },
  { meses: 48, taeMin: 0.0957, taeMax: 0.1734 },
  { meses: 60, taeMin: 0.0983, taeMax: 0.1684 },
  { meses: 72, taeMin: 0.095, taeMax: 0.1475 },
];

function calcularCuota(importe: number, meses: number, tae: number): number {
  const r = tae / 12;
  if (r === 0) return importe / meses;
  return importe * (r / (1 - Math.pow(1 + r, -meses)));
}

/** Rango [min, max] € de cuota mensual para un importe y plazo. null si faltan datos. */
export function rangoCuota(importe: number, meses: number): { min: number; max: number } | null {
  if (!importe || importe <= 0 || !meses || meses <= 0) return null;
  // Fuera del rango razonable de renting (24–72), la TAE del punto más cercano
  // no es fiable: no damos una cuota que engañe.
  if (meses < 12 || meses > 84) return null;
  // Plazo exacto o el más cercano de la tabla
  const rango = TAE_RANGES.find(r => r.meses === meses)
    ?? [...TAE_RANGES].sort((a, b) => Math.abs(a.meses - meses) - Math.abs(b.meses - meses))[0];
  return {
    min: calcularCuota(importe, meses, rango.taeMin),
    max: calcularCuota(importe, meses, rango.taeMax),
  };
}
