// Tarjetas de crédito, leídas del libro diario por su CUENTA CONTABLE exacta
// (fiable, nada de casar por texto). Modelo de caja: cuenta el RECIBO que el
// banco cobra (liquidación de la tarjeta = débito a la cuenta de la tarjeta con
// contrapartida en banco 57x). Los tickets (gasolina/parking/dietas cargados a
// la tarjeta) son solo el desglose, no se cuentan aparte (evita doble conteo).

import { type LibroLinea } from "@/lib/holdedLedger";

export interface TarjetaDef { cuenta: string; label: string; banco: string; }

// De momento solo la Sabadell (vamos una a una). Las otras cuando toque:
//  52000005 Bankinter (paga Microsoft/Holded → ya son fijos, ojo doble conteo)
//  52000009 Laboral Kutxa (hoteles/dietas)
export const TARJETAS: TarjetaDef[] = [
  { cuenta: "52000004", label: "Sabadell «business MC»", banco: "Sabadell" },
];
export const tarjetaDe = (cuenta: string) => TARJETAS.find(t => t.cuenta === cuenta) ?? null;

// Categorías del gasto de tarjeta. Se clasifica por el concepto del apunte del
// diario (los movimientos que se concilian semana a semana); dietas es el cajón
// por defecto (restaurantes y demás no llevan patrón fijo).
export type CategoriaTicket = "gasolina" | "parking" | "dietas";
export const CATEGORIAS_TICKET: { key: CategoriaTicket; label: string; emoji: string }[] = [
  { key: "gasolina", label: "Gasolina", emoji: "⛽" },
  { key: "parking", label: "Parking y peajes", emoji: "🅿️" },
  { key: "dietas", label: "Dietas y otros", emoji: "🍽️" },
];

const normDesc = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const RE_GASOLINA = /bisonte|campsa|repsol|cepsa|galp|shell|petroprix|ballenoil|plenoil|orpinsoil|estacion(es)? (de )?servicio|carburante|gasolinera|energy/;
const RE_PARKING = /parking|aparcamiento|aparcamien|garaje|santipark|general oraa|general ora|lavado car|car spa|peaje|autopista|seitt|empark|telpark/;

export function categoriaTicket(desc: string): CategoriaTicket {
  const d = normDesc(desc);
  if (RE_GASOLINA.test(d)) return "gasolina";
  if (RE_PARKING.test(d)) return "parking";
  return "dietas";
}

export interface TicketTarjeta { date: string; mesIdx: number; desc: string; importe: number; categoria: CategoriaTicket; }
export interface TarjetaMes {
  mesIdx: number;
  cargo: number;
  gastado: number;
  tickets: TicketTarjeta[];
  porCategoria: Record<CategoriaTicket, number>;
}

// Referencia de documento para deduplicar el mismo ticket contabilizado dos
// veces (una como "purchase" y otra como "expense"), que sí comparten ref.
function refDoc(desc: string): string {
  const m = (desc || "").match(/[A-Z0-9][A-Z0-9/\-]{5,}/);
  return m ? m[0] : "";
}

/** Resumen mes a mes de una tarjeta: recibo cobrado (caja) + tickets del mes. */
export function resumenTarjeta(entries: LibroLinea[], cuenta: string, anyo: number): TarjetaMes[] {
  const byE = new Map<number, LibroLinea[]>();
  for (const l of entries) { if (!byE.has(l.entry)) byE.set(l.entry, []); byE.get(l.entry)!.push(l); }
  const meses: TarjetaMes[] = Array.from({ length: 12 }, (_, mesIdx) => ({
    mesIdx, cargo: 0, gastado: 0, tickets: [],
    porCategoria: { gasolina: 0, parking: 0, dietas: 0 },
  }));
  const vistos = new Set<string>();
  for (const ls of byE.values()) {
    const tocaBanco = ls.some(l => l.account.startsWith("57"));
    for (const l of ls) {
      if (l.account !== cuenta || l.anyo !== anyo) continue;
      // Débito con contrapartida en banco = el banco liquida la tarjeta → cuenta en caja
      if (l.debit > 0.005 && tocaBanco) { meses[l.mesIdx].cargo += l.debit; continue; }
      // Crédito = ticket cargado a la tarjeta (detalle)
      if (l.credit > 0.005) {
        const ref = refDoc(l.description);
        const k = ref ? `${l.date}|${l.credit.toFixed(2)}|${ref}` : `e${l.entry}|${l.line}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        const categoria = categoriaTicket(l.description);
        meses[l.mesIdx].tickets.push({ date: l.date, mesIdx: l.mesIdx, desc: l.description || "(sin concepto)", importe: l.credit, categoria });
        meses[l.mesIdx].gastado += l.credit;
        meses[l.mesIdx].porCategoria[categoria] += l.credit;
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
