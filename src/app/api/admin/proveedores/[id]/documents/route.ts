import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { supplierDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteFile } from "@/lib/onedrive";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const nombre = (session.user as any).nombre ?? "Admin";
  const { url, filename, size } = await req.json();
  if (!url || !filename) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const [doc] = await db.insert(supplierDocuments).values({
    supplier_id: id,
    filename,
    url,
    size: size ?? null,
    uploaded_by: nombre,
  }).returning();

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { docId } = await req.json();
  const [existing] = await db.select({ url: supplierDocuments.url }).from(supplierDocuments).where(eq(supplierDocuments.id, docId)).limit(1);
  await db.delete(supplierDocuments).where(and(eq(supplierDocuments.id, docId), eq(supplierDocuments.supplier_id, id)));
  if (existing?.url?.startsWith("onedrive:")) {
    deleteFile(existing.url.slice(9)).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
