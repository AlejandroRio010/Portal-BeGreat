// Categorías de gasto editables desde el portal (tabla `categorias`).
// Sustituyen a la lista fija CATEGORIAS_GASTO como opciones del selector al
// etiquetar gastos fijos. Si la tabla aún no se ha sembrado, se cae a la lista
// de código para no dejar el selector vacío.

import { db } from "@/db";
import { categorias } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { CATEGORIAS_GASTO } from "@/lib/holded";

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
}

/** Filas de categorías de un tipo (con id, para gestionarlas). */
export async function getCategorias(tipo: "gasto" | "ingreso" = "gasto"): Promise<Categoria[]> {
  const rows = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.tipo, tipo), eq(categorias.activo, true)))
    .orderBy(asc(categorias.orden));
  return rows.map((r) => ({ id: r.id, nombre: r.nombre, orden: r.orden }));
}

/** Solo los nombres (para el selector). Con fallback a la lista de código. */
export async function getCategoriasGasto(): Promise<string[]> {
  const rows = await getCategorias("gasto");
  return rows.length ? rows.map((r) => r.nombre) : [...CATEGORIAS_GASTO];
}
