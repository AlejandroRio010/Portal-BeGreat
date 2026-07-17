"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") throw new Error("No autorizado");
}

function revalidar() {
  revalidatePath("/admin/finanzas/categorias");
  revalidatePath("/admin/finanzas/gastos");
  revalidatePath("/admin/finanzas/gastos/fijos");
}

/** Alta de una categoría (evita duplicados por tipo+nombre). */
export async function crearCategoria(tipo: string, nombre: string) {
  await requireAdmin();
  const t = tipo === "ingreso" ? "ingreso" : "gasto";
  const n = nombre?.trim();
  if (!n) return;
  const [ya] = await db.select({ id: categorias.id }).from(categorias)
    .where(and(eq(categorias.tipo, t), eq(categorias.nombre, n))).limit(1);
  if (ya) return; // ya existe
  const [last] = await db.select({ orden: categorias.orden }).from(categorias)
    .where(eq(categorias.tipo, t)).orderBy(desc(categorias.orden)).limit(1);
  await db.insert(categorias).values({ tipo: t, nombre: n, orden: (last?.orden ?? 0) + 1 });
  revalidar();
}

/** Elimina una categoría. Los gastos fijos que la usaran conservan el texto. */
export async function borrarCategoria(id: string) {
  await requireAdmin();
  await db.delete(categorias).where(eq(categorias.id, id));
  revalidar();
}

/** Renombra una categoría. */
export async function renombrarCategoria(id: string, nombre: string) {
  await requireAdmin();
  const n = nombre?.trim();
  if (!n) return;
  await db.update(categorias).set({ nombre: n }).where(eq(categorias.id, id));
  revalidar();
}
