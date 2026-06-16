import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, notes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const { id } = await params;

  // Verify the op belongs to this supplier
  const [op] = await db
    .select({ id: operations.id })
    .from(operations)
    .where(and(eq(operations.id, id), eq(operations.supplier_id, supplierId)))
    .limit(1);
  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json();
  if (!body.texto?.trim())
    return NextResponse.json({ error: "El texto es obligatorio" }, { status: 400 });

  const [note] = await db
    .insert(notes)
    .values({
      operation_id: id,
      texto: body.texto.trim(),
      author_name: session.user?.name ?? "Proveedor",
      author_id: supplierId,
    })
    .returning();

  return NextResponse.json(note, { status: 201 });
}
