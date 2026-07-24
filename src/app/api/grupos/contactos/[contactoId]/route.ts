import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientGroupContacts, clientGroups, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ contactoId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { contactoId } = await params;

  const [contacto] = await db.select().from(clientGroupContacts).where(eq(clientGroupContacts.id, contactoId)).limit(1);
  if (!contacto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Acceso al grupo: admin, o colaborador dueño del grupo, o con clientes dentro.
  const role = (session.user as any).role;
  if (role !== "admin") {
    const userId = (session.user as any).collaboratorId as string;
    const [grupo] = await db.select({ collaborator_id: clientGroups.collaborator_id })
      .from(clientGroups).where(eq(clientGroups.id, contacto.group_id)).limit(1);
    const propio = grupo?.collaborator_id === userId;
    const conClientes = propio || (await db.select({ id: clients.id })
      .from(clients).where(and(eq(clients.group_id, contacto.group_id), eq(clients.collaborator_id, userId))).limit(1)).length > 0;
    if (!conClientes) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(clientGroupContacts).where(eq(clientGroupContacts.id, contactoId));
  return NextResponse.json({ ok: true });
}
