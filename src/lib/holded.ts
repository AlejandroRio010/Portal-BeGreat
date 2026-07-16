// Cliente de la API v2 de Holded (solo lectura) para la sección de finanzas.
// La clave vive en HOLDED_API_KEY (scopes: contabilidad + ventas).

const BASE = "https://api.holded.com/api/v2";

/** Los históricos de finanzas empiezan aquí; lo anterior a 2026 no se considera. */
export const FINANZAS_DESDE = "2026-01-01";

export interface HoldedInvoice {
  id: string;
  document_number: string;
  contact_name: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  pagado: number;
  pendiente: number;
  estado: "cobrada" | "parcial" | "pendiente";
  cancelada: boolean;
  categoria: CategoriaIngreso;
  /** Cuenta contable (PGC) de la factura, p. ej. "70000000" */
  cuenta_pgc: string | null;
  /** Fecha del último cobro conciliado en Holded (YYYY-MM-DD) */
  fecha_cobro: string | null;
}

// ── Cuentas contables de Bearing Point S.L. (cuadro de cuentas) ──────────────
// Cada factura de venta va imputada a una cuenta = una línea de negocio.
// Mapa: ID interno de Holded → { PGC, etiqueta de negocio }. Es la fuente de
// verdad de la categorización (mucho más fiable que adivinar por concepto).
export const CUENTAS_INGRESO: Record<string, { pgc: string; label: CategoriaIngreso }> = {
  "66fc0ce89abd2620ac0ad5f8": { pgc: "70000000", label: "Renting de equipos" },
  "69aa848d68d1da188603346e": { pgc: "70000001", label: "Consultoría financiera" },
  "69aa87d1a4890577f80879bf": { pgc: "70000003", label: "NGN Group (recurrente)" },
  "69aa8739acc91e9d5e05ebac": { pgc: "70000002", label: "CFO Externo" },
  "69c4e7b5aa53212820046c59": { pgc: "70000004", label: "JP Financial (inversión)" },
};

export type CategoriaIngreso =
  | "Renting de equipos"
  | "Consultoría financiera"
  | "CFO Externo"
  | "NGN Group (recurrente)"
  | "JP Financial (inversión)"
  | "Comisiones"
  | "Otros";

/** Orden de las líneas de negocio en la interfaz. */
export const CATEGORIAS_INGRESO: CategoriaIngreso[] = [
  "Renting de equipos",
  "Consultoría financiera",
  "CFO Externo",
  "NGN Group (recurrente)",
  "JP Financial (inversión)",
  "Comisiones",
  "Otros",
];

/** Categoría por defecto al buscar facturas para vincular a una operación,
 *  según su pipeline. Renting → cuenta de renting; consultoría → consultoría. */
export function categoriaPorPipeline(pipelineKey: string | null): CategoriaIngreso | null {
  if (pipelineKey === "renting") return "Renting de equipos";
  if (pipelineKey === "consultoria") return "Consultoría financiera";
  return null;
}

/** Número Holded: "7.043,00" | "7043,00" → 7043.00 */
function num(s: unknown): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  return parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0;
}

// Cuenta contable de una factura: la de la primera línea con importe.
function cuentaDeFactura(lines: any[]): string | null {
  for (const l of lines ?? []) {
    if (num(l?.price) !== 0 && l?.account) return String(l.account);
  }
  // Si no hay línea con importe, coge la primera con cuenta
  for (const l of lines ?? []) if (l?.account) return String(l.account);
  return null;
}

function categorizar(cuentaId: string | null): { categoria: CategoriaIngreso; pgc: string | null } {
  if (cuentaId && CUENTAS_INGRESO[cuentaId]) {
    const c = CUENTAS_INGRESO[cuentaId];
    return { categoria: c.label, pgc: c.pgc };
  }
  // Cuenta 754 (Ingresos por comisiones) u otras no mapeadas
  return { categoria: "Otros", pgc: null };
}

// ── Fechas de cobro: /payments type=collection, join por document_id ─────────
// Ojo: en /payments los importes vienen con punto decimal (a diferencia de /invoices)
async function getFechasCobro(key: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | null = null;

  for (let page = 0; page < 30; page++) {
    const url = new URL(`${BASE}/payments`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) break; // sin fechas de cobro seguimos mostrando el resto
    const data = await res.json();

    for (const p of data.items ?? []) {
      if (p.type !== "collection" || !p.document_id) continue;
      const fecha = String(p.date ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
      const prev = map.get(p.document_id);
      if (!prev || fecha > prev) map.set(p.document_id, fecha);
    }

    if (!data.has_more) break;
    cursor = data.cursor;
  }
  return map;
}

// ── Fetch con paginación por cursor ──────────────────────────────────────────
export async function getFacturasVenta(): Promise<HoldedInvoice[]> {
  const key = process.env.HOLDED_API_KEY;
  if (!key) throw new Error("Falta HOLDED_API_KEY");

  const fechasCobro = await getFechasCobro(key);
  const out: HoldedInvoice[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 30; page++) {
    const url = new URL(`${BASE}/invoices`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Holded ${res.status}`);
    const data = await res.json();

    for (const i of data.items ?? []) {
      const total = num(i.total);
      const pendiente = num(i.payments_pending);
      const pagado = num(i.payments_total);
      const desc = i.description ?? i.lines?.[0]?.name ?? "";
      const cuentaId = cuentaDeFactura(i.lines);
      const { categoria, pgc } = categorizar(cuentaId);
      out.push({
        id: i.id,
        document_number: i.document_number,
        contact_name: i.contact_name ?? "—",
        description: desc || null,
        date: i.date,
        due_date: i.due_date ?? null,
        subtotal: num(i.subtotal),
        tax: num(i.tax),
        total,
        pagado,
        pendiente,
        estado: pendiente <= 0.005 ? "cobrada" : pagado > 0.005 ? "parcial" : "pendiente",
        cancelada: i.status === "cancelled",
        categoria,
        cuenta_pgc: pgc,
        fecha_cobro: fechasCobro.get(i.id) ?? null,
      });
    }

    if (!data.has_more) break;
    cursor = data.cursor;
  }

  // La API no filtra por fecha de forma fiable: filtramos aquí
  return out
    .filter(f => f.date >= FINANZAS_DESDE && !f.cancelada)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Varias facturas por sus ids (para las que hay vinculadas a una operación). */
export async function getFacturasByIds(ids: string[]): Promise<HoldedInvoice[]> {
  const limpios = ids.filter(Boolean);
  if (limpios.length === 0) return [];
  const out: HoldedInvoice[] = [];
  for (const id of limpios) {
    const f = await getFacturaVentaById(id);
    if (f) out.push(f);
  }
  return out;
}

/** Una factura concreta por su id (para mostrar el estado en la ficha de la op). */
export async function getFacturaVentaById(id: string): Promise<HoldedInvoice | null> {
  const key = process.env.HOLDED_API_KEY;
  if (!key || !id) return null;
  try {
    const res = await fetch(`${BASE}/invoices/${id}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const i = await res.json();
    if (!i?.id) return null;
    const total = num(i.total);
    const pendiente = num(i.payments_pending);
    const pagado = num(i.payments_total);
    const desc = i.description ?? i.lines?.[0]?.name ?? "";
    const { categoria, pgc } = categorizar(cuentaDeFactura(i.lines));
    const fechaCobro = await getFechaCobroDeFactura(key, id);
    return {
      id: i.id,
      document_number: i.document_number,
      contact_name: i.contact_name ?? "—",
      description: desc || null,
      date: i.date,
      due_date: i.due_date ?? null,
      subtotal: num(i.subtotal),
      tax: num(i.tax),
      total,
      pagado,
      pendiente,
      estado: pendiente <= 0.005 ? "cobrada" : pagado > 0.005 ? "parcial" : "pendiente",
      cancelada: i.status === "cancelled",
      categoria,
      cuenta_pgc: pgc,
      fecha_cobro: fechaCobro,
    };
  } catch {
    return null;
  }
}

/** Última fecha de cobro de una factura concreta (para la ficha de la op). */
async function getFechaCobroDeFactura(key: string, invoiceId: string): Promise<string | null> {
  let cursor: string | null = null;
  let best: string | null = null;
  for (let page = 0; page < 30; page++) {
    const url = new URL(`${BASE}/payments`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) break;
    const data = await res.json();
    for (const p of data.items ?? []) {
      if (p.type !== "collection" || p.document_id !== invoiceId) continue;
      const fecha = String(p.date ?? "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && (!best || fecha > best)) best = fecha;
    }
    if (!data.has_more) break;
    cursor = data.cursor;
  }
  return best;
}
