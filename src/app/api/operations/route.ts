import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, suppliers, contacts, collaborators } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateCodigoCLI, generateCodigoPRV, generateCodigoOP } from "@/lib/codigos";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).collaboratorId as string;
  const body = await req.json();

  const {
    pipeline_key,
    renting_rol,
    cliente_nombre,
    cliente_email,
    cliente_telefono,
    cliente_web,
    cliente_cif,
    cliente_cnae,
    cliente_provincia,
    contacto_nombre,
    contacto_puesto,
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
    es_renovacion,
    operacion_original_id: operacion_original_id_body,
    entidad_preferencia,
  } = body;

  if (!pipeline_key || !cliente_nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (!importe) {
    return NextResponse.json({ error: "El importe (sin IVA) es obligatorio" }, { status: 400 });
  }
  if (pipeline_key === "consultoria" && !producto) {
    return NextResponse.json({ error: "Selecciona un producto de financiación" }, { status: 400 });
  }
  if (pipeline_key === "renting" && !equipo_tipo) {
    return NextResponse.json({ error: "Selecciona el tipo de equipo" }, { status: 400 });
  }
  if (pipeline_key === "renting" && !plazo_meses) {
    return NextResponse.json({ error: "Selecciona el plazo deseado" }, { status: 400 });
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
    const clientCodigo = await generateCodigoCLI();
    const [newClient] = await db
      .insert(clients)
      .values({
        collaborator_id: userId,
        nombre: cliente_nombre,
        email: cliente_email || null,
        telefono: cliente_telefono || null,
        web: cliente_web || null,
        cif: cliente_cif || null,
        cnae: cliente_cnae || null,
        provincia: cliente_provincia || null,
        codigo: clientCodigo,
      })
      .returning();
    clientId = newClient.id;
  }

  // Add contact person to client if provided
  if (contacto_nombre && clientId) {
    const [yaExiste] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.client_id, clientId), eq(contacts.nombre, contacto_nombre)))
      .limit(1);
    if (!yaExiste) {
      await db.insert(contacts).values({
        client_id: clientId,
        nombre: contacto_nombre,
        email: contacto_email || null,
        telefono: contacto_telefono || null,
        rol: contacto_puesto || null,
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
      const prvCodigo = await generateCodigoPRV();
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
          codigo: prvCodigo,
        })
        .returning();
      supplierId = newSupplier.id;
    }
  }

  // Check if collaborator can publish without validation
  const [colabPerms] = await db
    .select({ puede_publicar_sin_validar: collaborators.puede_publicar_sin_validar })
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);
  const statusInicial = colabPerms?.puede_publicar_sin_validar ? "activa" : "pendiente_de_validar";

  const opCodigo = await generateCodigoOP(clientId);

  // Auto-generate operation name: "Empresa - OP N (Entidad)"
  // Count ALL operations globally for clients with this name (across all collaborators)
  const [{ count: opCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operations)
    .innerJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(clients.nombre, cliente_nombre));
  const opNum = Number(opCount) + 1;
  const entidadPart = entidad_preferencia ? ` (${entidad_preferencia})` : "";
  const autoNombre = `${cliente_nombre} - OP ${opNum}${entidadPart}`;

  // Resolve operacion_original_id
  let opOriginalId: string | null = operacion_original_id_body || null;

  const [op] = await db
    .insert(operations)
    .values({
      collaborator_id: userId,
      pipeline_key,
      nombre: autoNombre,
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
      es_renovacion: es_renovacion === true,
      operacion_original_id: opOriginalId,
      entidad_preferencia: entidad_preferencia || null,
      fase: "Pre-análisis",
      status: statusInicial,
      codigo: opCodigo,
    })
    .returning();

  return NextResponse.json(op, { status: 201 });
}
