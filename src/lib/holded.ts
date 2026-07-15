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
}

export type CategoriaIngreso =
  | "Consultoría financiera"
  | "Renting — comisiones"
  | "Renting — equipos (margen)"
  | "CFO Externo"
  | "Recurrentes USA"
  | "Productos de inversión"
  | "Grupo"
  | "Otros";

/** Número Holded: "7.043,00" | "7043,00" → 7043.00 */
function num(s: unknown): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  return parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0;
}

// ── Categorización por contacto + concepto (ajustable) ──────────────────────
const ENTIDADES_RENTING = ["grenke", "tendit", "ibercaja renting", "caja laboral", "laboral kutxa", "lk denda"];
const GRUPO = ["obliviate"];
const CFO = ["cfo"];
const RECURRENTES_USA = ["grupo ngn"];
const INVERSION = ["jp", "j.p", "triple a financial"];

function categorizar(contact: string, desc: string): CategoriaIngreso {
  const c = contact.toLowerCase();
  const d = desc.toLowerCase();

  if (GRUPO.some(k => c.includes(k))) return "Grupo";
  if (CFO.some(k => d.includes(k))) return "CFO Externo";
  if (RECURRENTES_USA.some(k => c.includes(k))) return "Recurrentes USA";
  if (INVERSION.some(k => c === k || c.startsWith(k + " ") || c.includes("triple a financial"))) return "Productos de inversión";

  const esEntidadRenting = ENTIDADES_RENTING.some(k => c.includes(k));
  const esComision = /honorari|comisi|contrato [a-z]?\d|consultor/i.test(d);
  if (esEntidadRenting) {
    // A la entidad se le factura o bien la comisión de la op o bien los equipos (modalidad margen)
    return esComision ? "Renting — comisiones" : "Renting — equipos (margen)";
  }
  if (/consultor|comisi|honorari/.test(d)) return "Consultoría financiera";
  // Facturas de equipos a empresas (modalidad en la que el cliente paga los equipos)
  if (/renting|equipo|maquina|sony|lector|hardware|portátil|servidor/i.test(d)) return "Renting — equipos (margen)";
  return "Otros";
}

// ── Fetch con paginación por cursor ──────────────────────────────────────────
export async function getFacturasVenta(): Promise<HoldedInvoice[]> {
  const key = process.env.HOLDED_API_KEY;
  if (!key) throw new Error("Falta HOLDED_API_KEY");

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
        categoria: categorizar(i.contact_name ?? "", desc ?? ""),
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
