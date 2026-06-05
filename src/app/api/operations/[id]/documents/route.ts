import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationDocuments, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user!.id as string;
  const role = (session.user as any).role;
  const nombre = (session.user as any).nombre ?? "Usuario";

  // Verify access: admin can upload to any op, collaborator only their own
  if (role !== "admin") {
    const [op] = await db.select({ id: operations.id }).from(operations)
      .where(and(eq(operations.id, id), eq(operations.collaborator_id, userId))).limit(1);
    if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Upload to Vercel Blob
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const blobKeys = Object.keys(process.env).filter(k => k.includes("BLOB"));
  console.log("[documents] BLOB env keys:", blobKeys);
  console.log("[documents] token present:", !!blobToken);
  console.log("[documents] file name:", file.name, "size:", file.size);
  let blob;
  try {
    if (!blobToken) return NextResponse.json({ error: `Token no encontrado. BLOB keys en runtime: ${blobKeys.join(", ") || "NINGUNA"}` }, { status: 500 });
    blob = await put(`ops/${id}/${file.name}`, file, { access: "public", token: blobToken });
  } catch (err) {
    console.error("[documents] blob error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const [doc] = await db.insert(operationDocuments).values({
    operation_id: id,
    filename: file.name,
    url: blob.url,
    size: file.size,
    uploaded_by: nombre,
  }).returning();

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { docId } = await req.json();
  await db.delete(operationDocuments).where(eq(operationDocuments.id, docId));
  return NextResponse.json({ ok: true });
}
