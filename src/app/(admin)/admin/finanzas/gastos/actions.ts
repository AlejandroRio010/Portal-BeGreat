"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { gastosFijos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") throw new Error("No autorizado");
}

export interface NuevoGastoFijo {
  label: string;
  proveedor_match: string;
  holded_contact_id: string | null;
  mensual: number | null;
  categoria: string | null;
  nota: string | null;
}

/** Alta de un gasto fijo (desde el buscador de facturas de Holded). */
export async function crearGastoFijo(input: NuevoGastoFijo) {
  await requireAdmin();
  const label = input.label?.trim();
  const match = input.proveedor_match?.trim();
  if (!label || !match) throw new Error("Faltan datos del gasto fijo");

  await db.insert(gastosFijos).values({
    label,
    proveedor_match: match,
    holded_contact_id: input.holded_contact_id || null,
    mensual: input.mensual != null && !Number.isNaN(input.mensual) ? String(input.mensual) : null,
    categoria: input.categoria?.trim() || null,
    nota: input.nota?.trim() || null,
  });

  revalidatePath("/admin/finanzas/gastos");
  revalidatePath("/admin/finanzas/gastos/fijos");
}

/** Solo los admins pueden quitar un gasto fijo. */
export async function borrarGastoFijo(id: string) {
  await requireAdmin();
  await db.delete(gastosFijos).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos");
  revalidatePath("/admin/finanzas/gastos/fijos");
}

/** Fija el estado y/o el importe manual de un fijo de Obliviate en un mes.
 *  estado: "pendiente" | "recibida" | "pagada". importe: override de ese mes. */
export async function setEstadoFijo(id: string, ym: string, estado?: string, importe?: number | null) {
  await requireAdmin();
  const [row] = await db.select({ estado: gastosFijos.estado_manual, empresa: gastosFijos.empresa })
    .from(gastosFijos).where(eq(gastosFijos.id, id)).limit(1);
  if (!row || row.empresa !== "obliviate") throw new Error("Solo aplica a gastos fijos de Obliviate");
  const map = { ...((row.estado as Record<string, any>) ?? {}) };
  const prev = map[ym];
  const prevI = typeof prev === "object" ? prev?.i : undefined;
  // e: si llega estado válido lo usamos; si es "pendiente"/undefined, se quita
  // "pendiente" se guarda explícito (porque el default sin marca = asumido pagado)
  const e = (estado === "recibida" || estado === "pagada" || estado === "pendiente") ? estado
    : (typeof prev === "string" ? prev : prev?.e);
  // i: si llega importe (incluido null para borrar) lo aplicamos; si no, se conserva
  const i = importe === undefined ? prevI : (importe != null && !Number.isNaN(importe) ? importe : undefined);
  if (!e && i == null) delete map[ym];
  else map[ym] = { ...(e ? { e } : {}), ...(i != null ? { i } : {}) };
  await db.update(gastosFijos).set({ estado_manual: map }).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
}

/** Edita el importe base mensual de un gasto fijo. */
export async function setImporteBaseFijo(id: string, mensual: number | null) {
  await requireAdmin();
  const val = mensual != null && !Number.isNaN(mensual) ? String(mensual) : null;
  await db.update(gastosFijos).set({ mensual: val }).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
}
