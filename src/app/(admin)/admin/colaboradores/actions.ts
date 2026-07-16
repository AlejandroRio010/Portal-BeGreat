"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { generateCodigoCOL } from "@/lib/codigos";

/**
 * Alta rápida de un colaborador (payee) para poder atribuirle comisiones.
 * No crea cuenta de acceso: es un colaborador sin login (activo=false) hasta
 * que se le den credenciales desde su ficha. Basta con el nombre.
 */
export async function crearColaboradorRapido(input: { nombre: string; cif?: string | null; es_autonomo?: boolean }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") throw new Error("No autorizado");

  const nombre = input.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  const codigo = await generateCodigoCOL();
  const email = `${codigo.toLowerCase()}@sin-acceso.begreat`;

  await db.insert(collaborators).values({
    nombre,
    email,
    password_hash: "sin-acceso",
    role: "colaborador",
    identificador: codigo,
    codigo,
    activo: false, // sin acceso hasta configurar credenciales en su ficha
    razon_social: nombre,
    cif: input.cif?.trim() || null,
    es_autonomo: !!input.es_autonomo,
  });

  revalidatePath("/admin/colaboradores");
}
