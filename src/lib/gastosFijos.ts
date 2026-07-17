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
  empresa: string;                  // "bearing" (cruza Holded) | "obliviate" (manual)
  periodicidad: string;             // "mensual" | "anual"
  mes_cobro: number | null;         // 1-12, solo para los anuales
}

/** Importe del fijo que aplica a un mes concreto (mesIdx 0-11).
 *  Los anuales solo cuentan en su mes de cobro; los mensuales, todos los meses. */
export function importeFijoMes(f: GastoFijo, mesIdx: number): number {
  const imp = f.mensual ?? 0;
  if (f.periodicidad === "anual") return f.mes_cobro === mesIdx + 1 ? imp : 0;
  return imp;
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
      empresa: r.empresa ?? "bearing",
      periodicidad: r.periodicidad ?? "mensual",
      mes_cobro: r.mes_cobro ?? null,
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
