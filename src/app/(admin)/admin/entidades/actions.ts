"use server";

import { db } from "@/db";
import { financialEntities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function eliminarEntidad(entidadId: string) {
  await db.delete(financialEntities).where(eq(financialEntities.id, entidadId));
  revalidatePath("/admin/entidades");
}
