import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { docChecklistCustomItems, docChecklistEntries, clients, suppliers, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function canAccessEntity(session: any, entityType: string, entityId: string): Promise<boolean> {
  const role = (session.user as any).role;
  if (role === "admin") return true;
  if (entityType === "cliente" || entityType === "avalista") {
    if ((session.user as any).collaboratorId) {
      const [c] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, entityId), eq(clients.collaborator_id, (session.user as any).collaboratorId))).limit(1);
      return !!c;
    }
    if ((session.user as any).supplierId) {
      const [op] = await db.select({ id: operations.id }).from(operations).where(and(eq(operations.client_id, entityId), eq(operations.supplier_id, (session.user as any).supplierId))).limit(1);
      return !!op;
    }
  }
  if (entityType === "proveedor") {
    if ((session.user as any).collaboratorId) {
      const [s] = await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, entityId), eq(suppliers.collaborator_id, (session.user as any).collaboratorId))).limit(1);
      return !!s;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity_type, entity_id, nombre, tipo } = await req.json();
  if (!entity_type || !entity_id || !nombre)
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  if (!(await canAccessEntity(session, entity_type, entity_id)))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const [item] = await db.insert(docChecklistCustomItems).values({
    entity_type,
    entity_id,
    nombre,
    tipo: tipo || "simple",
  }).returning();

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const [item] = await db.select({ entity_type: docChecklistCustomItems.entity_type, entity_id: docChecklistCustomItems.entity_id }).from(docChecklistCustomItems).where(eq(docChecklistCustomItems.id, id)).limit(1);
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!(await canAccessEntity(session, item.entity_type, item.entity_id)))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await db.delete(docChecklistEntries).where(eq(docChecklistEntries.custom_item_id, id));
  await db.delete(docChecklistCustomItems).where(eq(docChecklistCustomItems.id, id));

  return NextResponse.json({ ok: true });
}
