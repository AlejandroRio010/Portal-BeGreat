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
