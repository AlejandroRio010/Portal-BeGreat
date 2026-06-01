import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const body = await req.json();

  const { pipeline_key, cliente_nombre, importe, descripcion, proveedor_nombre, lugar_entrega } = body;

  if (!pipeline_key || !cliente_nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Get or create client
  let clientId: string | null = null;
  if (cliente_nombre) {
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.collaborator_id, userId), eq(clients.nombre, cliente_nombre)))
      .limit(1);

    if (existing) {
      clientId = existing.id;
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({ collaborator_id: userId, nombre: cliente_nombre })
        .returning();
      clientId = newClient.id;
    }
  }

  // Get or create supplier (renting only)
  let supplierId: string | null = null;
  if (pipeline_key === "renting" && proveedor_nombre) {
    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.collaborator_id, userId), eq(suppliers.nombre, proveedor_nombre)))
      .limit(1);

    if (existing) {
      supplierId = existing.id;
    } else {
      const [newSupplier] = await db
        .insert(suppliers)
        .values({ collaborator_id: userId, nombre: proveedor_nombre })
        .returning();
      supplierId = newSupplier.id;
    }
  }

  const initialFase =
    pipeline_key === "consultoria" ? "Pre-analysis" : "Pre-analysis";

  const [op] = await db
    .insert(operations)
    .values({
      collaborator_id: userId,
      pipeline_key,
      client_id: clientId,
      supplier_id: supplierId,
      importe: importe || null,
      descripcion: descripcion || null,
      lugar_entrega: lugar_entrega || null,
      fase: initialFase,
      status: "pendiente_de_validar",
    })
    .returning();

  return NextResponse.json(op, { status: 201 });
}
