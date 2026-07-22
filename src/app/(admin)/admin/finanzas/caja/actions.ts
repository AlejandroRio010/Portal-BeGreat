"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { finanzasValores } from "@/db/schema";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") throw new Error("No autorizado");
}

/** Fija el saldo que había en los bancos a 1 de enero (para convertir la
 *  variación del libro diario en caja absoluta a fin de cada mes). */
export async function setSaldoInicial(anyo: number, valor: number) {
  await requireAdmin();
  if (valor == null || Number.isNaN(valor)) throw new Error("Valor inválido");
  await db.insert(finanzasValores)
    .values({ clave: `saldo_inicial_bancos_${anyo}`, valor: String(valor) })
    .onConflictDoUpdate({ target: finanzasValores.clave, set: { valor: String(valor), updated_at: new Date() } });
  revalidatePath("/admin/finanzas/caja");
}
