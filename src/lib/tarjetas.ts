// Tarjetas de crédito, leídas del libro diario por su CUENTA CONTABLE exacta
// (fiable, nada de casar por texto). Modelo de caja: cuenta el RECIBO que el
// banco cobra (liquidación de la tarjeta = débito a la cuenta de la tarjeta con
// contrapartida en banco 57x). Los tickets (gasolina/parking/dietas cargados a
// la tarjeta) son solo el desglose, no se cuentan aparte (evita doble conteo).

import { type LibroLinea, esAcreedor } from "@/lib/holdedLedger";

export interface TarjetaDef { cuenta: string; cuentas: string[]; label: string; banco: string; }

// Las 3 tarjetas de crédito, todas con el MISMO mecanismo: recibo a mes vencido
// (caja) + movimientos del mes clasificados. Cada movimiento se identifica como
// ticket (solo existe en la tarjeta) o pago de una factura registrada (el
// asiento toca la cuenta 40x del proveedor) — esas facturas ya cuentan en
// fijos/variables, así que se descuentan del recibo en caja para no duplicar.
// Da igual qué tarjeta se use para qué: la clasificación es automática.
// OJO: una tarjeta puede tener VARIAS cuentas contables (en abril 2026 la
// contabilidad movió los movimientos de la Sabadell a 52010001 y los de la
// Bankinter a 52010000; los recibos siguen en las cuentas antiguas).
export const TARJETAS: TarjetaDef[] = [
  { cuenta: "52000004", cuentas: ["52000004", "52010001"], label: "Sabadell «business MC»", banco: "Sabadell" },
  { cuenta: "52000005", cuentas: ["52000005", "52010000"], label: "Bankinter", banco: "Bankinter" },
  { cuenta: "52000009", cuentas: ["52000009"], label: "Laboral Kutxa", banco: "Laboral Kutxa" },
];
export const tarjetaDe = (cuenta: string) => TARJETAS.find(t => t.cuentas.includes(cuenta)) ?? null;

// Categorías del gasto de tarjeta. Se clasifica por el concepto del apunte del
// diario (los movimientos que se concilian semana a semana); dietas es el cajón
// por defecto (restaurantes y demás no llevan patrón fijo).
export type CategoriaTicket = "gasolina" | "parking" | "dietas";
export const CATEGORIAS_TICKET: { key: CategoriaTicket; label: string }[] = [
  { key: "gasolina", label: "Gasolina" },
  { key: "parking", label: "Parking y peajes" },
  { key: "dietas", label: "Dietas y otros" },
];

const normDesc = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const RE_GASOLINA = /bisonte|campsa|repsol|cepsa|galp|shell|petroprix|ballenoil|plenoil|orpinsoil|petronor|avia|disa|\bbp\b|estacion(es)? (de )?servicio|carburante|combustible|gasolinera|energy/;
const RE_PARKING = /parking|aparcamiento|aparcamien|garaje|santipark|general oraa|general ora|lavado car|car spa|peaje|autopista|seitt|empark|telpark/;

export function categoriaTicket(desc: string): CategoriaTicket {
  const d = normDesc(desc);
  if (RE_GASOLINA.test(d)) return "gasolina";
  if (RE_PARKING.test(d)) return "parking";
  return "dietas";
}

export interface TicketTarjeta {
  date: string;
  mesIdx: number;
  desc: string;
  importe: number;
  categoria: CategoriaTicket;
  /** El asiento toca la cuenta 40x de un proveedor → es el pago de una factura
   *  registrada (esa factura ya cuenta en fijos/variables), no un ticket. */
  pagaFactura: boolean;
  /** Referencia de documento del apunte (para casarla con la factura de Holded). */
  ref: string | null;
  /** Viene de una factura del cajón tarjeta aún sin conciliar como movimiento. */
  esFactura?: boolean;
}
export interface TarjetaMes {
  mesIdx: number;
  cargo: number;
  gastado: number;                              // todo lo cargado a la tarjeta en el mes
  pagosFactura: number;                         // parte que son pagos de facturas registradas
  tickets: TicketTarjeta[];
  porCategoria: Record<CategoriaTicket, number>; // solo tickets (sin pagos de factura)
}

/** Normaliza una referencia de documento para casar apunte ↔ factura de Holded. */
export const normRef = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Referencia de documento para deduplicar el mismo ticket contabilizado dos
// veces (una como "purchase" y otra como "expense"), que sí comparten ref.
function refDoc(desc: string): string {
  const m = (desc || "").match(/[A-Z0-9][A-Z0-9/\-]{5,}/);
  return m ? m[0] : "";
}

/** Resumen mes a mes de una tarjeta: recibo cobrado (caja) + tickets del mes.
 *  Acepta una cuenta o varias (una tarjeta puede cambiar de cuenta contable). */
export function resumenTarjeta(entries: LibroLinea[], cuenta: string | string[], anyo: number): TarjetaMes[] {
  const cuentasTarjeta = new Set(Array.isArray(cuenta) ? cuenta : [cuenta]);
  const byE = new Map<number, LibroLinea[]>();
  for (const l of entries) { if (!byE.has(l.entry)) byE.set(l.entry, []); byE.get(l.entry)!.push(l); }
  const meses: TarjetaMes[] = Array.from({ length: 12 }, (_, mesIdx) => ({
    mesIdx, cargo: 0, gastado: 0, pagosFactura: 0, tickets: [],
    porCategoria: { gasolina: 0, parking: 0, dietas: 0 },
  }));
  const vistos = new Set<string>();
  for (const ls of byE.values()) {
    const tocaBanco = ls.some(l => l.account.startsWith("57"));
    const tocaProveedor = ls.some(l => esAcreedor(l.account));
    for (const l of ls) {
      if (!cuentasTarjeta.has(l.account) || l.anyo !== anyo) continue;
      // Débito con contrapartida en banco = el banco liquida la tarjeta → cuenta en caja
      if (l.debit > 0.005 && tocaBanco) { meses[l.mesIdx].cargo += l.debit; continue; }
      // Crédito = cargo a la tarjeta: ticket, o pago de una factura registrada
      if (l.credit > 0.005) {
        const ref = refDoc(l.description);
        const k = ref ? `${l.date}|${l.credit.toFixed(2)}|${ref}` : `e${l.entry}|${l.line}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        const pagaFactura = tocaProveedor;
        const categoria = categoriaTicket(l.description);
        meses[l.mesIdx].tickets.push({ date: l.date, mesIdx: l.mesIdx, desc: l.description || "(sin concepto)", importe: l.credit, categoria, pagaFactura, ref });
        meses[l.mesIdx].gastado += l.credit;
        if (pagaFactura) meses[l.mesIdx].pagosFactura += l.credit;
        else meses[l.mesIdx].porCategoria[categoria] += l.credit;
      }
    }
  }
  for (const m of meses) m.tickets.sort((a, b) => b.importe - a.importe);
  return meses;
}

/** Recibo (cargo) de la tarjeta que el banco cobra en un mes concreto (caja). */
export function cargoTarjetaMes(entries: LibroLinea[], cuenta: string, anyo: number, mesIdx: number): number {
  return resumenTarjeta(entries, cuenta, anyo)[mesIdx]?.cargo ?? 0;
}
