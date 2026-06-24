import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { avalDocuments, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteFile } from "@/lib/onedrive";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  const nombre = (session.user as any).nombre ?? "Usuario";

  if (role !== "admin") {
    const userId = (session.user as any).collaboratorId ?? (session.user as any).supplierId;
    const field = (session.user as any).collaboratorId ? operations.collaborator_id : operations.supplier_id;
    const [op] = await db.select({ id: operations.id }).from(operations)
      .where(and(eq(operations.id, id), eq(field, userId))).limit(1);
    if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const { url, filename, size } = await req.json();
  if (!url || !filename) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const [doc] = await db.insert(avalDocuments).values({
    operation_id: id,
    filename,
    url,
    size: size ?? null,
    uploaded_by: nombre,
  }).returning();

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  if (role !== "admin") {
    const userId = (session.user as any).collaboratorId ?? (session.user as any).supplierId;
    const field = (session.user as any).collaboratorId ? operations.collaborator_id : operations.supplier_id;
    const [op] = await db.select({ id: operations.id }).from(operations)
      .where(and(eq(operations.id, id), eq(field, userId))).limit(1);
    if (!op) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { docId } = await req.json();
  const [existing] = await db.select({ url: avalDocuments.url }).from(avalDocuments).where(eq(avalDocuments.id, docId)).limit(1);
  await db.delete(avalDocuments).where(and(eq(avalDocuments.id, docId), eq(avalDocuments.operation_id, id)));
  if (existing?.url?.startsWith("onedrive:")) {
    deleteFile(existing.url.slice(9)).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
