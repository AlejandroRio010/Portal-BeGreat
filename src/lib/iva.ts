// Motor de IVA de Bearing Point S.L. — corre "por detrás" del portal:
// los importes de negocio se muestran siempre SIN IVA, y este módulo lleva la
// cuenta del IVA repercutido (ventas) y soportado (compras) por mes y por
// trimestre, para la reserva de Hacienda y la futura liquidación (modelo 303).

import type { HoldedInvoice, HoldedGasto } from "@/lib/holded";

export interface IvaMes {
  ym: string;           // "2026-03"
  repercutido: number;  // IVA de las facturas de venta emitidas en el mes
  soportado: number;    // IVA de las facturas de compra recibidas en el mes
  resultado: number;    // repercutido − soportado (positivo = a pagar)
}

export interface IvaTrimestre {
  q: number;            // 1-4
  anyo: number;
  repercutido: number;
  soportado: number;
  resultado: number;    // a ingresar en el modelo 303 (si es positivo)
  meses: IvaMes[];
}

/** IVA por mes del año (criterio de devengo: fecha de la factura). */
export function ivaPorMes(facturas: HoldedInvoice[], compras: HoldedGasto[], anyo: number): IvaMes[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ym = `${anyo}-${String(i + 1).padStart(2, "0")}`;
    const repercutido = facturas
      .filter(f => f.date.startsWith(ym) && !f.cancelada)
      .reduce((s, f) => s + f.tax, 0);
    const soportado = compras
      .filter(g => g.date.startsWith(ym) && !g.borrador)
      .reduce((s, g) => s + g.tax, 0);
    return { ym, repercutido, soportado, resultado: repercutido - soportado };
  });
}

/** IVA por trimestre (agrupa el detalle mensual; resultado = lo del modelo 303). */
export function ivaPorTrimestre(facturas: HoldedInvoice[], compras: HoldedGasto[], anyo: number): IvaTrimestre[] {
  const meses = ivaPorMes(facturas, compras, anyo);
  return [0, 1, 2, 3].map(qi => {
    const del = meses.slice(qi * 3, qi * 3 + 3);
    const repercutido = del.reduce((s, m) => s + m.repercutido, 0);
    const soportado = del.reduce((s, m) => s + m.soportado, 0);
    return { q: qi + 1, anyo, repercutido, soportado, resultado: repercutido - soportado, meses: del };
  });
}

/** IVA ya COBRADO de las ventas de un rango de meses (criterio de caja: lo que
 *  conviene ir apartando de la cuenta, aunque el 303 vaya por devengo). */
export function ivaCobradoEn(facturas: HoldedInvoice[], yms: string[]): number {
  return facturas
    .filter(f => !f.cancelada && f.estado === "cobrada" && yms.some(ym => f.date.startsWith(ym)))
    .reduce((s, f) => s + f.tax, 0);
}
