// Gastos fijos (recurrentes) de Bearing Point S.L.
// La API de Holded no expone las "facturas recurrentes", así que la lista de
// proveedores fijos vive en la tabla `gastos_fijos` (editable desde el portal)
// y el estado de cada mes se resuelve cruzando con las compras reales
// (proveedor / contacto + conciliación de pago).

import { db } from "@/db";
import { gastosFijos as gastosFijosTable } from "@/db/schema";
import { asc } from "drizzle-orm";

export interface GastoFijo {
  id: string;
  label: string;
  match: string;                    // subcadena del nombre del proveedor (normalizada)
  holded_contact_id: string | null; // si está, el match es exacto por contacto
  mensual: number | null;           // importe mensual con IVA; null si es variable
  categoria: string;
  nota?: string | null;
}

/** Lista de gastos fijos configurada (desde la tabla `gastos_fijos`). */
export async function getGastosFijos(): Promise<GastoFijo[]> {
  const rows = await db
    .select()
    .from(gastosFijosTable)
    .orderBy(asc(gastosFijosTable.label));
  return rows
    .filter((r) => r.activo)
    .map((r) => ({
      id: r.id,
      label: r.label,
      match: r.proveedor_match,
      holded_contact_id: r.holded_contact_id,
      mensual: r.mensual != null ? Number(r.mensual) : null,
      categoria: r.categoria ?? "Otros gastos",
      nota: r.nota,
    }));
}

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * ¿Una compra es de este gasto fijo?
 * Si el gasto fijo tiene contacto de Holded y la compra también, se casa por id
 * (exacto). Si no, por nombre de proveedor (subcadena normalizada).
 */
export function esDelFijo(g: GastoFijo, proveedor: string, contactId?: string | null): boolean {
  if (g.holded_contact_id && contactId) return g.holded_contact_id === contactId;
  return norm(proveedor).includes(norm(g.match));
}
