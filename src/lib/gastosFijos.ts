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
  mensual: number | null;           // importe mensual base (sin IVA); null si es variable
  categoria: string;
  nota?: string | null;
  cuenta_id: string | null;         // si está, casa solo las facturas con esta cuenta contable
  cuenta_label: string | null;      // etiqueta legible de la cuenta (para mostrar)
  empresa: string;                  // "bearing" (cruza Holded) | "obliviate" (manual)
  periodicidad: string;             // "mensual" | "anual"
  mes_cobro: number | null;         // 1-12, solo para los anuales
  // Estado + importe manual por mes: { "2026-3": { e?: "recibida"|"pagada", i?: number } }
  // (tolera el formato antiguo string: "recibida"|"pagada")
  estado_manual: Record<string, any>;
}

// IVA de los gastos fijos de Obliviate (servicios → 21%). Los importes se guardan
// SIN IVA (base); el total con IVA se calcula por detrás para caja/impuestos.
export const IVA_OBLIVIATE = 0.21;
export const conIva = (base: number) => base * (1 + IVA_OBLIVIATE);

/** Importe (base, SIN IVA) del fijo que aplica a un mes concreto (mesIdx 0-11).
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
      cuenta_id: r.cuenta_id ?? null,
      cuenta_label: r.cuenta_label ?? null,
      empresa: r.empresa ?? "bearing",
      periodicidad: r.periodicidad ?? "mensual",
      mes_cobro: r.mes_cobro ?? null,
      estado_manual: (r.estado_manual as Record<string, any>) ?? {},
    }));
}

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * ¿Una compra es de este gasto fijo?
 * 1) Proveedor: por id de contacto de Holded (exacto) o, si no, por nombre.
 * 2) Cuenta: si el fijo está acotado a una cuenta contable (cuenta_id), la
 *    compra debe tener esa misma cuenta — así se separan dos gastos del mismo
 *    proveedor (Movistar telecom vs. renting de iPhone).
 */
export function esDelFijo(g: GastoFijo, proveedor: string, contactId?: string | null, cuentaId?: string | null): boolean {
  const provOk = g.holded_contact_id && contactId
    ? g.holded_contact_id === contactId
    : norm(proveedor).includes(norm(g.match));
  if (!provOk) return false;
  if (g.cuenta_id) return cuentaId === g.cuenta_id;
  return true;
}

// ─── Candidatos para "añadir gasto fijo" (con desglose por cuenta contable) ────
type GastoLike = { proveedor: string; contact_id: string | null; cuenta_id: string | null; categoria: string; total: number; subtotal: number; date: string };
export interface CuentaCandidato { id: string; label: string; base: number; n: number; yaFijo: boolean }
export interface CandidatoFijo {
  proveedor: string; contactId: string | null; categoria: string;
  importe: number; base: number; fecha: string; n: number; yaFijo: boolean;
  cuentas: CuentaCandidato[];
}

/** Agrupa las compras por proveedor (y por cuenta contable dentro de cada uno)
 *  para el buscador de alta de gastos fijos. Permite separar, p. ej., las dos
 *  facturas de Movistar (telecomunicaciones vs. renting de iPhone). */
export function construirCandidatos(gastos: GastoLike[], fijosBearing: GastoFijo[]): CandidatoFijo[] {
  const cubre = (prov: string, contactId: string | null, cuentaId: string | null) =>
    fijosBearing.some(f => esDelFijo(f, prov, contactId, cuentaId));

  type Acc = {
    proveedor: string; contactId: string | null; categoria: string;
    importe: number; base: number; fecha: string; n: number;
    cuentas: Map<string, { id: string; label: string; base: number; n: number; fecha: string }>;
  };
  const accMap = new Map<string, Acc>();
  for (const g of gastos) {
    const key = g.contact_id ?? norm(g.proveedor);
    let acc = accMap.get(key);
    if (!acc) {
      acc = { proveedor: g.proveedor, contactId: g.contact_id, categoria: g.categoria, importe: g.total, base: g.subtotal, fecha: g.date, n: 0, cuentas: new Map() };
      accMap.set(key, acc);
    }
    acc.n++;
    if (g.date >= acc.fecha) { acc.fecha = g.date; acc.importe = g.total; acc.base = g.subtotal; acc.categoria = g.categoria; }
    if (g.cuenta_id) {
      let cu = acc.cuentas.get(g.cuenta_id);
      if (!cu) { cu = { id: g.cuenta_id, label: g.categoria, base: g.subtotal, n: 0, fecha: g.date }; acc.cuentas.set(g.cuenta_id, cu); }
      cu.n++;
      if (g.date >= cu.fecha) { cu.fecha = g.date; cu.base = g.subtotal; cu.label = g.categoria; }
    }
  }

  return [...accMap.values()].map(acc => {
    const cuentas: CuentaCandidato[] = [...acc.cuentas.values()]
      .sort((a, b) => b.n - a.n)
      .map(cu => ({ id: cu.id, label: cu.label, base: cu.base, n: cu.n, yaFijo: cubre(acc.proveedor, acc.contactId, cu.id) }));
    const cubiertoTodas = cubre(acc.proveedor, acc.contactId, null); // hay un fijo "todas las cuentas"
    const yaFijo = cubiertoTodas || (cuentas.length > 0 && cuentas.every(c => c.yaFijo));
    return { proveedor: acc.proveedor, contactId: acc.contactId, categoria: acc.categoria, importe: acc.importe, base: acc.base, fecha: acc.fecha, n: acc.n, yaFijo, cuentas };
  });
}
