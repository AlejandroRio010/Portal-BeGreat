/**
 * Cálculo canónico de comisiones de una operación.
 *
 * La comisión de BeGreat puede estar registrada de dos formas:
 *  1. Directamente en el campo `comision_begreat`.
 *  2. Implícita: honorarios cobrados (suma de `comision_origenes`) menos lo que
 *     se llevan los colaboradores (`colaboradores_comision` o el campo legacy
 *     `comision_colaborador`).
 *
 * Estos helpers unifican ese cálculo para que el resumen mensual, el historial
 * y cualquier KPI muestren siempre lo mismo.
 */

type Origen = { importe?: string | null };
type ColabCom = { nombre?: string | null; importe?: string | null };

export interface OpComision {
  comision_begreat?: string | number | null;
  comision_colaborador?: string | number | null;
  comision_origenes?: Origen[] | null;
  colaboradores_comision?: ColabCom[] | null;
  modalidad_renting?: string | null;
  importe_facturado_begreat?: string | number | null;
  importe?: string | number | null;
}

const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

/** Suma de lo que se llevan los colaboradores (array nuevo o campo legacy). */
export function comisionColaboradoresDeOp(o: OpComision): number {
  const arr = (o.colaboradores_comision ?? [])
    .reduce((s, c) => s + (parseFloat(c.importe ?? "") || 0), 0);
  if (arr > 0) return arr;
  return n(o.comision_colaborador);
}

/** Honorarios totales cobrados al cliente por la operación. */
export function honorariosDeOp(o: OpComision): number {
  const sumOrigenes = (o.comision_origenes ?? [])
    .reduce((s, x) => s + (parseFloat(x.importe ?? "") || 0), 0);
  if (sumOrigenes > 0) return sumOrigenes;
  const esFactura = o.modalidad_renting === "begreat_factura" && o.importe_facturado_begreat && o.importe;
  if (esFactura) return n(o.importe_facturado_begreat) - n(o.importe);
  return n(o.comision_begreat) + comisionColaboradoresDeOp(o);
}

/** Comisión que se queda BeGreat: el campo directo si existe, si no honorarios − colaboradores. */
export function comisionBegreatDeOp(o: OpComision): number {
  const directa = n(o.comision_begreat);
  if (directa > 0) return directa;
  const derivada = honorariosDeOp(o) - comisionColaboradoresDeOp(o);
  return derivada > 0 ? derivada : 0;
}
