import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operations, collaborators, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPendingValidationDigest } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendientes = await db
    .select({
      nombre: operations.nombre,
      colaborador: collaborators.nombre,
      fecha: operations.created_at,
    })
    .from(operations)
    .leftJoin(collaborators, eq(operations.collaborator_id, collaborators.id))
    .where(eq(operations.status, "pendiente_de_validar"))
    .orderBy(operations.created_at);

  if (pendientes.length === 0) {
    return NextResponse.json({ message: "No hay operaciones pendientes", sent: false });
  }

  const admins = await db
    .select({ email: collaborators.email, nombre: collaborators.nombre })
    .from(collaborators)
    .where(eq(collaborators.role, "admin"));

  const ops = pendientes.map((p) => ({
    nombre: p.nombre ?? "Sin nombre",
    colaborador: p.colaborador ?? "Desconocido",
    fecha: new Date(p.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
  }));

  for (const admin of admins) {
    try {
      await sendPendingValidationDigest(admin.email, admin.nombre, ops);
    } catch (e: any) {
      console.error(`[Digest] Error sending to ${admin.email}:`, e.message);
    }
  }

  return NextResponse.json({ message: `Digest enviado a ${admins.length} admin(s)`, ops: ops.length, sent: true });
}
