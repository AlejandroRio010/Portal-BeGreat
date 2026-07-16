// Helpers puros (sin llamadas a red) para el enlace op ↔ facturas de Holded.

export interface FacturaLink {
  id: string;
  number: string | null;
}

/** Lista de facturas vinculadas a una op: usa holded_invoices y cae al single legacy. */
export function facturasDeOp(op: {
  holded_invoices?: unknown;
  holded_invoice_id?: string | null;
  holded_invoice_number?: string | null;
}): FacturaLink[] {
  const arr = (op.holded_invoices as FacturaLink[] | null) ?? [];
  const limpio = arr.filter(f => f && f.id);
  if (limpio.length > 0) return limpio;
  if (op.holded_invoice_id) return [{ id: op.holded_invoice_id, number: op.holded_invoice_number ?? null }];
  return [];
}

function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  // Los importes de la operación ya vienen en formato canónico con PUNTO decimal:
  // numeric de la DB ("129795.00") y rawFromFmt del formulario ("5197.80").
  // NO son formato español, así que NO hay que quitar el punto (eso multiplicaba ×100).
  return parseFloat(String(v)) || 0;
}

/** Importe base (sin IVA) que se debería haber cobrado en la operación.
 *  - BeGreat factura: el importe facturado por BeGreat.
 *  - Comisiona / consultoría: el FEE TOTAL (suma de orígenes de comisión), que
 *    es lo que realmente se cobra a la entidad/cliente. El IVA se añade después
 *    al comparar con la factura. Fallback a comisión BeGreat + colaboradores. */
export function cobroEsperadoBase(op: {
  modalidad_renting?: string | null;
  importe_facturado_begreat?: string | null;
  comision_origenes?: unknown;
  comision_begreat?: string | null;
  colaboradores_comision?: unknown;
}): number {
  if (op.modalidad_renting === "begreat_factura") return n(op.importe_facturado_begreat);
  // Fee total = suma de los orígenes de comisión (lo que se cobra)
  const origenes = (op.comision_origenes as { importe?: string }[] | null) ?? [];
  const feeTotal = origenes.reduce((s, o) => s + n(o.importe), 0);
  if (feeTotal > 0) return feeTotal;
  // Fallback: comisión BeGreat + lo repartido a colaboradores
  const colabs = (op.colaboradores_comision as { importe?: string }[] | null) ?? [];
  const colabTotal = colabs.reduce((s, c) => s + n(c.importe), 0);
  return n(op.comision_begreat) + colabTotal;
}

/** ¿La suma de facturas cuadra con lo esperado (base o base+21% IVA)? */
export function cuadra(sumaFacturas: number, esperadoBase: number): boolean {
  if (esperadoBase <= 0) return true; // sin referencia, no avisamos
  const conIva = esperadoBase * 1.21;
  const cerca = (v: number) => Math.abs(sumaFacturas - v) <= Math.max(1, v * 0.015);
  return cerca(esperadoBase) || cerca(conIva);
}
