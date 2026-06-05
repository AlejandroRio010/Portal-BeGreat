import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationDocuments, operations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const CLOUDINARY_CLOUD = "dgcbkeqw0";
const CLOUDINARY_PRESET = "begreat_docs";

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

  // Upload to Cloudinary as base64 (more reliable from server-side)
  const fileBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(fileBuffer).toString("base64");
  const dataUri = `data:${file.type || "application/octet-stream"};base64,${base64}`;

  const cloudForm = new FormData();
  cloudForm.append("file", dataUri);
  cloudForm.append("upload_preset", CLOUDINARY_PRESET);
  cloudForm.append("folder", `begreat/ops/${id}`);
  cloudForm.append("public_id", file.name.replace(/\.[^/.]+$/, ""));
  cloudForm.append("resource_type", "auto");

  const cloudRes = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`,
    { method: "POST", body: cloudForm }
  );

  if (!cloudRes.ok) {
    const err = await cloudRes.text();
    console.error("[documents] cloudinary error:", err);
    return NextResponse.json({ error: "Error al subir a Cloudinary: " + err }, { status: 500 });
  }

  const cloud = await cloudRes.json();
  const url: string = cloud.secure_url;

  const [doc] = await db.insert(operationDocuments).values({
    operation_id: id,
    filename: file.name,
    url,
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
