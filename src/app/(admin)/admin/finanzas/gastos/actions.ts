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

/** Fija el estado manual de un fijo de Obliviate en un mes (lo elige el admin
 *  desde el desplegable): "pendiente" | "recibida" | "pagada". */
export async function setEstadoFijo(id: string, ym: string, estado: string) {
  await requireAdmin();
  const [row] = await db.select({ estado: gastosFijos.estado_manual, empresa: gastosFijos.empresa })
    .from(gastosFijos).where(eq(gastosFijos.id, id)).limit(1);
  if (!row || row.empresa !== "obliviate") throw new Error("Solo aplica a gastos fijos de Obliviate");
  const map = { ...((row.estado as Record<string, string>) ?? {}) };
  if (estado === "recibida" || estado === "pagada") map[ym] = estado;
  else delete map[ym]; // pendiente = ausente
  await db.update(gastosFijos).set({ estado_manual: map }).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
}
