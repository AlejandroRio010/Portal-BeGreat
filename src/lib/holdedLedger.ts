// Libro diario de Holded (API v2 /ledger-entries). Es la fuente de verdad para
// el estado de los gastos fijos de Bearing: cada proveedor tiene su cuenta
// acreedora (400x/410x); cuando llega la factura se abona (crédito) y cuando se
// paga se carga (débito). Con el saldo de esa cuenta sabemos si está pagada, y
// el cargo a la cuenta de gasto (grupo 6) nos da la base sin IVA.

const BASE = "https://api.holded.com/api/v2";
import { FINANZAS_DESDE } from "@/lib/holded";

export interface LibroLinea {
  entry: number;         // entry_number (asiento)
  line: number;          // nº de línea dentro del asiento
  date: string;          // YYYY-MM-DD
  mesIdx: number;        // 0-11
  anyo: number;
  type: string;          // "purchase" | "payment" | ...
  description: string;
  account: string;       // nº de cuenta PGC (p. ej. "40000046", "62900008")
  debit: number;
  credit: number;
}

const num = (v: any) => parseFloat(String(v)) || 0;
export const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Cuenta acreedora de proveedor (400x/410x), excluyendo cuentas "padre" redondas. */
export function esAcreedor(account: string): boolean {
  const a = String(account);
  return (a.startsWith("40") || a.startsWith("41")) && Number(a) % 1000000 !== 0;
}
const esGasto = (account: string) => String(account)[0] === "6";

/** Descarga el libro diario del ejercicio en curso (desde FINANZAS_DESDE). */
export async function getLibroDiario(): Promise<LibroLinea[]> {
  const key = process.env.HOLDED_API_KEY;
  if (!key) throw new Error("Falta HOLDED_API_KEY");
  const desde = FINANZAS_DESDE;                 // 2026-01-01
  const hasta = `${FINANZAS_DESDE.slice(0, 4)}-12-31`;
  const out: LibroLinea[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 40; page++) {
    const url = new URL(`${BASE}/ledger-entries`);
    url.searchParams.set("start_date", desde);
    url.searchParams.set("end_date", hasta);
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Holded diario ${res.status}`);
    const data = await res.json();
    const items = data.items ?? [];
    for (const l of items) {
      const [dd, mm, yyyy] = String(l.date).split("/");
      const anyo = Number(yyyy), mesIdx = Number(mm) - 1;
      out.push({
        entry: l.entry_number, line: l.line, date: `${yyyy}-${mm}-${dd}`, mesIdx, anyo,
        type: l.type ?? "", description: l.description ?? "", account: String(l.account),
        debit: num(l.debit), credit: num(l.credit),
      });
    }
    if (!data.cursor || !items.length) break;
    cursor = data.cursor;
  }
  // CRÍTICO: el API devuelve líneas duplicadas (mismo asiento+línea varias veces).
  // Deduplicamos por (entry, line) o cualquier suma saldría inflada.
  const vistos = new Set<string>();
  return out.filter(l => {
    const k = `${l.entry}|${l.line}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// Asientos agrupados por número (para razonar por factura/pago completo)
function porAsiento(entries: LibroLinea[]): Map<number, LibroLinea[]> {
  const m = new Map<number, LibroLinea[]>();
  for (const l of entries) { if (!m.has(l.entry)) m.set(l.entry, []); m.get(l.entry)!.push(l); }
  return m;
}

/** Cuentas acreedoras de un proveedor: las 400x/410x que aparecen en asientos de
 *  compra cuya descripción contiene el término. */
export function acreedoresDe(entries: LibroLinea[], term: string): Set<string> {
  const t = norm(term);
  const accs = new Set<string>();
  if (!t) return accs;
  for (const ls of porAsiento(entries).values()) {
    if (!ls.some(l => l.type === "purchase")) continue;
    if (!ls.some(l => norm(l.description).includes(t))) continue;
    for (const l of ls) if (esAcreedor(l.account)) accs.add(l.account);
  }
  return accs;
}

export interface MesLibro {
  mesIdx: number;
  base: number;        // cargo a cuentas de gasto (grupo 6), sin IVA
  factura: number;     // total facturado ese mes (crédito acreedor, con IVA)
  hayFactura: boolean; // se registró factura/gasto ese mes
  pagada: boolean;     // el acreedor quedó liquidado hasta ese mes
}

/** Estado mes a mes de un proveedor a partir del libro diario.
 *  1) Vía acreedor: saldo de sus cuentas 400x/410x (crédito=factura, débito=pago).
 *     base = cargo a la cuenta de gasto del mismo asiento.
 *  2) Fallback recibo directo (sin acreedor): líneas que casan el término y tocan
 *     banco (57x/52x) → recibida y pagada el mismo mes; base del cargo de gasto. */
export function estadoLibroPorProveedor(entries: LibroLinea[], termRaw: string, anyo: number, cuentasFiltro?: string[] | null): MesLibro[] {
  const term = terminoEfectivo(entries, termRaw);
  const t = norm(term);
  const meses = Array.from({ length: 12 }, (_, mesIdx) => ({ mesIdx, base: 0, factura: 0, credito: 0, debito: 0, hayFactura: false, banco: false }));
  let accs = acreedoresDe(entries, term);
  // Si el fijo está acotado a cuentas acreedoras concretas (separar Movistar), filtra
  if (cuentasFiltro && cuentasFiltro.length) accs = new Set([...accs].filter(a => cuentasFiltro.includes(a)));

  if (accs.size) {
    for (const ls of porAsiento(entries).values()) {
      if (!ls.some(l => accs.has(l.account))) continue;
      for (const l of ls) {
        if (l.anyo !== anyo) continue;
        const m = meses[l.mesIdx];
        if (accs.has(l.account)) { m.credito += l.credit; m.debito += l.debit; if (l.credit > 0.005) m.hayFactura = true; }
        else if (esGasto(l.account)) { m.base += l.debit - l.credit; if (l.debit - l.credit > 0.005) m.hayFactura = true; }
      }
    }
    let saldo = 0;
    return meses.map(m => {
      saldo += m.credito - m.debito;
      return { mesIdx: m.mesIdx, base: round2(m.base), factura: round2(m.credito), hayFactura: m.hayFactura, pagada: m.hayFactura && saldo <= 0.05 };
    });
  }

  // Fallback: recibo directo (sin cuenta acreedora)
  for (const ls of porAsiento(entries).values()) {
    if (!ls.some(l => norm(l.description).includes(t))) continue;
    const tocaBanco = ls.some(l => l.account.startsWith("57") || l.account.startsWith("52"));
    for (const l of ls) {
      if (l.anyo !== anyo) continue;
      if (esGasto(l.account)) {
        const m = meses[l.mesIdx];
        const cargo = l.debit - l.credit;
        if (cargo > 0.005) { m.base += cargo; m.hayFactura = true; if (tocaBanco) m.banco = true; }
      }
    }
  }
  return meses.map(m => ({ mesIdx: m.mesIdx, base: round2(m.base), factura: round2(m.base), hayFactura: m.hayFactura, pagada: m.hayFactura && m.banco }));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Si el término completo no casa ningún acreedor, prueba con su primera palabra
 *  (los nombres del diario suelen venir truncados/en mayúsculas: "TELEFONICA DE E"). */
export function terminoEfectivo(entries: LibroLinea[], term: string): string {
  if (acreedoresDe(entries, term).size) return term;
  const fw = (term || "").trim().split(/\s+/)[0];
  if (fw && fw.length >= 4 && acreedoresDe(entries, fw).size) return fw;
  return term;
}

/** Nº de líneas del diario que casan un término (para validar el proveedor). */
export function movimientosQueCasan(entries: LibroLinea[], term: string): number {
  const t = norm(terminoEfectivo(entries, term));
  if (!t) return 0;
  return entries.filter(l => norm(l.description).includes(t)).length;
}

/** Lista de proveedores vistos en el diario (para sugerencias al vincular). */
export function proveedoresDelLibro(entries: LibroLinea[]): { nombre: string; cuenta: string; n: number }[] {
  const map = new Map<string, { nombre: string; cuenta: string; n: number }>();
  for (const ls of porAsiento(entries).values()) {
    if (!ls.some(l => l.type === "purchase")) continue;
    const acc = ls.find(l => esAcreedor(l.account))?.account;
    if (!acc) continue;
    const desc = ls.find(l => norm(l.description))?.description ?? "";
    const nombre = extraerNombre(desc);
    if (!nombre) continue;
    const prev = map.get(acc);
    if (prev) prev.n++;
    else map.set(acc, { nombre, cuenta: acc, n: 1 });
  }
  return [...map.values()].sort((a, b) => b.n - a.n);
}

// Extrae un nombre de proveedor legible de la descripción del asiento.
function extraerNombre(desc: string): string {
  const d = (desc || "").trim();
  if (d.includes("/")) return d.split("/")[1]?.trim().replace(/\s{2,}.*$/, "") || d;
  const parts = d.split(",").map(s => s.trim()).filter(Boolean);
  // "Compra, DOC, NOMBRE, ..." | "(Purchase), DOC, NOMBRE"
  if (parts.length >= 3) return parts[2];
  return parts[parts.length - 1] || d;
}
