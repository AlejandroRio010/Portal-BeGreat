"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { gastosFijos, tarjetaCargos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
  empresa?: string;              // "bearing" (cruza Holded) | "obliviate" (manual)
  periodicidad?: string;         // "mensual" | "anual"
  mes_cobro?: number | null;     // 1-12, solo anuales
  cuenta_id?: string | null;     // acota el fijo a una cuenta contable de Holded
  cuenta_label?: string | null;  // etiqueta legible de esa cuenta
}

/** Alta de un gasto fijo. Bearing → desde el buscador de facturas de Holded;
 *  Obliviate → alta manual (no está en Holded). */
export async function crearGastoFijo(input: NuevoGastoFijo) {
  await requireAdmin();
  const label = input.label?.trim();
  const empresa = input.empresa === "obliviate" ? "obliviate" : "bearing";
  // Obliviate no cruza con Holded: el "match" es solo el propio nombre.
  const match = (input.proveedor_match?.trim() || label);
  if (!label || !match) throw new Error("Faltan datos del gasto fijo");

  await db.insert(gastosFijos).values({
    label,
    proveedor_match: match,
    holded_contact_id: empresa === "obliviate" ? null : (input.holded_contact_id || null),
    mensual: input.mensual != null && !Number.isNaN(input.mensual) ? String(input.mensual) : null,
    categoria: input.categoria?.trim() || null,
    nota: input.nota?.trim() || null,
    empresa,
    periodicidad: input.periodicidad === "anual" ? "anual" : "mensual",
    mes_cobro: input.periodicidad === "anual" && input.mes_cobro ? input.mes_cobro : null,
    cuenta_id: empresa === "obliviate" ? null : (input.cuenta_id || null),
    cuenta_label: empresa === "obliviate" ? null : (input.cuenta_label || null),
  });

  revalidatePath("/admin/finanzas/gastos");
  revalidatePath("/admin/finanzas/gastos/fijos");
}

/** Fija el proveedor (término que se busca en el libro diario) de un gasto fijo.
 *  Opcionalmente enlaza el contacto de Holded. Con esto el diario "busca bien". */
export async function setProveedorFijo(id: string, proveedorMatch: string, holdedContactId?: string | null) {
  await requireAdmin();
  const m = proveedorMatch?.trim();
  if (!m) return;
  const set: Record<string, any> = { proveedor_match: m };
  if (holdedContactId !== undefined) set.holded_contact_id = holdedContactId || null;
  await db.update(gastosFijos).set(set).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
}

/** Edita el nombre y/o el concepto (nota) de un gasto fijo. */
export async function editarGastoFijo(id: string, campos: { label?: string; nota?: string | null }) {
  await requireAdmin();
  const set: Record<string, any> = {};
  if (campos.label !== undefined) {
    const l = campos.label.trim();
    if (l) set.label = l;
  }
  if (campos.nota !== undefined) set.nota = campos.nota?.trim() || null;
  if (Object.keys(set).length === 0) return;
  await db.update(gastosFijos).set(set).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
}

/** Guarda (o borra) una nota de un mes concreto de un gasto fijo — p. ej. explicar
 *  por qué un mes se ha cobrado más de lo estipulado. Vale para Bearing y Obliviate:
 *  se guarda en el mismo jsonb `estado_manual` bajo la clave `nota`. */
export async function setNotaMesFijo(id: string, ym: string, nota: string | null) {
  await requireAdmin();
  const [row] = await db.select({ estado: gastosFijos.estado_manual })
    .from(gastosFijos).where(eq(gastosFijos.id, id)).limit(1);
  if (!row) throw new Error("Gasto fijo no encontrado");
  const map = { ...((row.estado as Record<string, any>) ?? {}) };
  const cur = map[ym];
  const prev = typeof cur === "object" && cur ? cur : (typeof cur === "string" ? { e: cur } : {});
  const nn = nota?.trim();
  const next: Record<string, any> = { ...prev };
  if (nn) next.nota = nn; else delete next.nota;
  if (Object.keys(next).length === 0) delete map[ym];
  else map[ym] = next;
  await db.update(gastosFijos).set({ estado_manual: map }).where(eq(gastosFijos.id, id));
  revalidatePath("/admin/finanzas/gastos/fijos");
  revalidatePath("/admin/finanzas/gastos");
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

/** Fija (o borra) el cargo mensual global de la tarjeta de crédito de un mes. */
export async function setCargoTarjeta(year: number, month: number, importe: number | null) {
  await requireAdmin();
  if (importe == null || Number.isNaN(importe) || importe <= 0) {
    await db.delete(tarjetaCargos).where(and(eq(tarjetaCargos.year, year), eq(tarjetaCargos.month, month)));
  } else {
    await db.insert(tarjetaCargos).values({ year, month, importe: String(importe) })
      .onConflictDoUpdate({ target: [tarjetaCargos.year, tarjetaCargos.month], set: { importe: String(importe) } });
  }
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
