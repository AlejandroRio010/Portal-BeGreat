import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;
  const body = await req.json();

  const {
    pipeline_key,
    renting_rol,
    cliente_nombre,
    cliente_email,
    cliente_telefono,
    cliente_web,
    contacto_nombre,
    contacto_email,
    contacto_telefono,
    proveedor_nombre,
    proveedor_email,
    proveedor_telefono,
    proveedor_web,
    proveedor_contacto_nombre,
    proveedor_contacto_email,
    proveedor_contacto_telefono,
    producto,
    importe,
    equipo_tipo,
    plazo_meses,
    lugar_entrega,
    descripcion,
    contacto_directo,
  } = body;

  if (!pipeline_key || !cliente_nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Get or create client
  let clientId: string | null = null;
  const [existingClient] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.collaborator_id, userId), eq(clients.nombre, cliente_nombre)))
    .limit(1);

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const [newClient] = await db
      .insert(clients)
      .values({
        collaborator_id: userId,
        nombre: cliente_nombre,
        email: cliente_email || null,
        telefono: cliente_telefono || null,
        web: cliente_web || null,
      })
      .returning();
    clientId = newClient.id;

    // Add contact person if provided
    if (contacto_nombre && clientId) {
      await db.insert(contacts).values({
        client_id: clientId,
        nombre: contacto_nombre,
        email: contacto_email || null,
        telefono: contacto_telefono || null,
      });
    }
  }

  // Get or create supplier (renting only)
  let supplierId: string | null = null;
  if (pipeline_key === "renting" && proveedor_nombre) {
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.collaborator_id, userId), eq(suppliers.nombre, proveedor_nombre)))
      .limit(1);

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      const [newSupplier] = await db
        .insert(suppliers)
        .values({
          collaborator_id: userId,
          nombre: proveedor_nombre,
          email: proveedor_email || null,
          telefono: proveedor_telefono || null,
          web: proveedor_web || null,
          persona_contacto: proveedor_contacto_nombre || null,
          contacto_email: proveedor_contacto_email || null,
          contacto_telefono: proveedor_contacto_telefono || null,
        })
        .returning();
      supplierId = newSupplier.id;
    }
  }

  const initialFase = pipeline_key === "consultoria" ? "Pre-analysis" : "Pre-analysis";

  const [op] = await db
    .insert(operations)
    .values({
      collaborator_id: userId,
      pipeline_key,
      client_id: clientId,
      supplier_id: supplierId,
      producto: producto || null,
      importe: importe || null,
      renting_rol: renting_rol || null,
      equipo_tipo: equipo_tipo || null,
      plazo_meses: plazo_meses ? parseInt(plazo_meses) : null,
      lugar_entrega: lugar_entrega || null,
      descripcion: descripcion || null,
      contacto_directo: contacto_directo === "true",
      fase: initialFase,
      status: "pendiente_de_validar",
    })
    .returning();

  return NextResponse.json(op, { status: 201 });
}
