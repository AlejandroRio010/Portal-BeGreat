"use server";

import { updateTag } from "next/cache";
import { auth } from "@/lib/auth";

// Invalida la caché de datos de Holded (5 min de vida por defecto) para ver
// al momento lo recién conciliado/facturado. updateTag = expiración inmediata
// en server actions (revalidateTag de un argumento está deprecado en Next 16).
export async function refreshHolded() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") return { ok: false };
  updateTag("holded");
  return { ok: true };
}
