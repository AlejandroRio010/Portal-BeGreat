import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, contacts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateCodigoCLI, generateCodigoPRV, generateCodigoOP } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    collaborator_id, pipeline_key, nombre,
    cliente_nombre, cliente_email, cliente_telefono, cliente_web, cliente_cif, cliente_cnae, cliente_provincia, cliente_direccion, cliente_nombre_comercial,
    contacto_nombre, contacto_email, contacto_telefono,
    proveedor_nombre, proveedor_email, proveedor_telefono, proveedor_web, proveedor_contacto_nombre, proveedor_contacto_email, proveedor_contacto_telefono,
    producto, producto_otro, importe, equipo_tipo, plazo_meses, lugar_entrega, descripcion, descripcion_equipo,
    status, es_renovacion, operacion_original_id,
    client_id: bodyClientId,
  } = body;
  const productoFinal = producto === "Otro" && producto_otro ? producto_otro : producto;

  if (!pipeline_key || !cliente_nombre || !collaborator_id) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Get or create client (under the selected collaborator)
  let clientId: string | null = bodyClientId || null;
  if (!clientId) {
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.collaborator_id, collaborator_id), eq(clients.nombre, cliente_nombre)))
      .limit(1);
    if (existingClient) clientId = existingClient.id;
  }

  if (!clientId) {
    const clientCodigo = await generateCodigoCLI();
    const [newClient] = await db
      .insert(clients)
      .values({
        collaborator_id, nombre: cliente_nombre,
        email: cliente_email || null, telefono: cliente_telefono || null,
        web: cliente_web || null, cif: cliente_cif || null,
        cnae: cliente_cnae || null, provincia: cliente_provincia || null,
        direccion: cliente_direccion || null, nombre_comercial: cliente_nombre_comercial || null, codigo: clientCodigo,
      })
      .returning();
    clientId = newClient.id;
  }

  // Añadir la persona de contacto al cliente (nuevo o existente) si no estaba ya
  if (contacto_nombre && clientId) {
    const [yaExiste] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.client_id, clientId), eq(contacts.nombre, contacto_nombre)))
      .limit(1);
    if (!yaExiste) {
      await db.insert(contacts).values({
        client_id: clientId, nombre: contacto_nombre,
        email: contacto_email || null, telefono: contacto_telefono || null,
      });
    }
  }

  // Get or create supplier
  let supplierId: string | null = null;
  if (pipeline_key === "renting" && proveedor_nombre) {
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.collaborator_id, collaborator_id), eq(suppliers.nombre, proveedor_nombre)))
      .limit(1);

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      const prvCodigo = await generateCodigoPRV();
      const [newSupplier] = await db
        .insert(suppliers)
        .values({
          collaborator_id, nombre: proveedor_nombre,
          email: proveedor_email || null, telefono: proveedor_telefono || null,
          web: proveedor_web || null, persona_contacto: proveedor_contacto_nombre || null,
          contacto_email: proveedor_contacto_email || null, contacto_telefono: proveedor_contacto_telefono || null,
          codigo: prvCodigo,
        })
        .returning();
      supplierId = newSupplier.id;
    }
  }

  const opCodigo = await generateCodigoOP(clientId);

  // Auto-generate name
  let displayName = cliente_nombre;
  if (clientId) {
    const [cli] = await db.select({ nombre: clients.nombre, nombre_comercial: clients.nombre_comercial }).from(clients).where(eq(clients.id, clientId)).limit(1);
    if (cli) displayName = cli.nombre_comercial?.trim() || cli.nombre;
  }
  const [{ count: opCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operations)
    .where(eq(operations.client_id, clientId!));
  const opNum = Number(opCount) + 1;
  const autoNombre = `${displayName} - OP ${opNum}`;

  const [op] = await db
    .insert(operations)
    .values({
      collaborator_id, pipeline_key,
      nombre: autoNombre,
      client_id: clientId, supplier_id: supplierId,
      producto: productoFinal || null, importe: importe || null,
      equipo_tipo: equipo_tipo || null,
      plazo_meses: plazo_meses ? parseInt(plazo_meses) : null,
      lugar_entrega: lugar_entrega || null,
      descripcion: [descripcion_equipo, descripcion].filter(Boolean).join("\n\n---\n\n") || null,
      es_renovacion: es_renovacion === true,
      operacion_original_id: operacion_original_id || null,
      fase: "Pre-análisis",
      status: status || "activa",
      codigo: opCodigo,
      ...(pipeline_key === "renting" ? { fecha_contrato: new Date() } : {}),
    })
    .returning();

  return NextResponse.json(op, { status: 201 });
}
