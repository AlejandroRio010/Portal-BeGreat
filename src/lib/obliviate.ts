// Movimientos bancarios de Obliviate (segunda empresa del grupo, fuera de
// Holded): categorización automática del extracto del Sabadell y agregados
// para la caja consolidada del grupo.

export type CategoriaObliviate = "cobro" | "intragrupo" | "comision" | "fijo" | "tarjeta" | "impuestos" | "efectivo" | "otros";

export const CATEGORIAS_OBLIVIATE: { key: CategoriaObliviate; label: string; nota: string }[] = [
  { key: "cobro", label: "Cobros", nota: "entradas reales (Grenke, devoluciones…)" },
  { key: "intragrupo", label: "Intragrupo", nota: "facturación cruzada con Bearing — neutra para el grupo" },
  { key: "comision", label: "Comisiones", nota: "pagos a colaboradores desde Obliviate" },
  { key: "fijo", label: "Gastos fijos", nota: "ya contados en los fijos de Obliviate — no vuelven a sumar" },
  { key: "tarjeta", label: "Tarjeta", nota: "liquidación mensual de la tarjeta" },
  { key: "impuestos", label: "Impuestos", nota: "IRPF / IS de Obliviate" },
  { key: "efectivo", label: "Efectivo", nota: "reintegros de cajero" },
  { key: "otros", label: "Otros", nota: "resto de pagos" },
];

/** Categoría automática de un movimiento del extracto, por su concepto. */
export function categoriaDeMovimiento(concepto: string, importe: number): CategoriaObliviate {
  const c = (concepto || "").toUpperCase();
  if (importe > 0) return c.includes("BEARING") ? "intragrupo" : "cobro";
  if (c.includes("TARJETA CREDITO")) return "tarjeta";
  if (c.includes("IMPUESTOS")) return "impuestos";
  if (c.includes("REINTEGRO CAJERO")) return "efectivo";
  if (["EXPELLIARM", "MASMOVIL", "GC RE PIPE"].some(k => c.includes(k))) return "fijo";
  if (c.includes("TRANSFERENCIA A") && ["PABLO", "ALEJANDR", "HUMAN", "MARTA"].some(k => c.includes(k))) return "comision";
  return "otros";
}

export interface MovObliviate { fecha: string; concepto: string; importe: number; saldo: number | null; categoria: CategoriaObliviate }

export interface ObliviateMes {
  mesIdx: number;
  /** Entradas reales del grupo (sin intragrupo), en efectivo (con IVA). */
  cobros: number;
  /** Salidas que cuentan como gasto del grupo: comisiones, tarjeta, impuestos, efectivo y otros (los fijos ya cuentan en los fijos de Obliviate; el intragrupo es neutro). */
  gastos: number;
  /** Flujo total de banco del mes (todo incluido) — para la caja. */
  flujo: number;
  porCategoria: Record<CategoriaObliviate, number>;
}

const CATS_GASTO_GRUPO: CategoriaObliviate[] = ["comision", "tarjeta", "impuestos", "efectivo", "otros"];

export function obliviatePorMes(movs: MovObliviate[], anyo: number): ObliviateMes[] {
  const meses: ObliviateMes[] = Array.from({ length: 12 }, (_, mesIdx) => ({
    mesIdx, cobros: 0, gastos: 0, flujo: 0,
    porCategoria: { cobro: 0, intragrupo: 0, comision: 0, fijo: 0, tarjeta: 0, impuestos: 0, efectivo: 0, otros: 0 },
  }));
  for (const m of movs) {
    const [y, mm] = m.fecha.split("-").map(Number);
    if (y !== anyo || !mm) continue;
    const M = meses[mm - 1];
    M.flujo += m.importe;
    M.porCategoria[m.categoria] += m.importe;
    if (m.categoria === "cobro") M.cobros += m.importe;
    else if (CATS_GASTO_GRUPO.includes(m.categoria)) M.gastos += -m.importe;
  }
  return meses;
}
