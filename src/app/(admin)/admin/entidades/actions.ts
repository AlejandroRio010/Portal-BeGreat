"use server";

import { db } from "@/db";
import { financialEntities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function eliminarEntidad(entidadId: string) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(financialEntities).where(eq(financialEntities.id, entidadId));

  revalidatePath("/admin/entidades");
  redirect("/admin/entidades");
}
