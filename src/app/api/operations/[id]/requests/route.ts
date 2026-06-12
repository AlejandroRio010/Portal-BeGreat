import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { infoRequests, operations, collaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendInfoRequestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST — admin creates an info request (sends email to collaborator)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { mensaje } = await req.json();
  if (!mensaje?.trim()) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });

  const authorId = ((session.user as any).collaboratorId ?? session.user?.id) as string;
  const authorName = session.user?.name ?? "Administrador";

  const [op] = await db
    .select({ id: operations.id, nombre: operations.nombre, collaborator_id: operations.collaborator_id })
    .from(operations)
    .where(eq(operations.id, id))
    .limit(1);
  if (!op) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  const [request] = await db
    .insert(infoRequests)
    .values({ operation_id: id, author_id: authorId, author_name: authorName, mensaje: mensaje.trim() })
    .returning();

  // Send email to collaborator
  try {
    const [colab] = await db
      .select({ email: collaborators.email, nombre: collaborators.nombre })
      .from(collaborators)
      .where(eq(collaborators.id, op.collaborator_id))
      .limit(1);
    if (colab) {
      await sendInfoRequestEmail(colab.email, colab.nombre, op.nombre ?? "Operación", id, mensaje.trim(), authorName);
    }
  } catch (e: any) {
    console.error("[InfoRequest] Email error:", e.message);
  }

  return NextResponse.json(request, { status: 201 });
}

// PATCH — collaborator responds to an info request
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { requestId, respuesta } = await req.json();
  if (!requestId || !respuesta?.trim()) return NextResponse.json({ error: "Campos obligatorios" }, { status: 400 });

  await db
    .update(infoRequests)
    .set({ respuesta: respuesta.trim(), respondido: true, responded_at: new Date() })
    .where(and(eq(infoRequests.id, requestId), eq(infoRequests.operation_id, id)));

  return NextResponse.json({ ok: true });
}
