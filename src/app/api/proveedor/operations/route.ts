import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, clients, contacts, collaborators, suppliers, supplierProducts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateCodigoCLI, generateCodigoOP } from "@/lib/codigos";
import { sanitizeNumeric } from "@/lib/format";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "proveedor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supplierId = (session.user as any).supplierId as string;
  const body = await req.json();

  const {
    cliente_nombre,
    cliente_email,
    cliente_telefono,
    cliente_web,
    cliente_cif,
    cliente_cnae,
    cliente_provincia,
    cliente_nombre_comercial,
    contacto_nombre,
    contacto_puesto,
    contacto_email,
    contacto_telefono,
    importe,
    equipo_tipo,
    plazo_meses,
    lugar_entrega,
    descripcion,
    descripcion_equipo,
    contacto_directo,
    client_id: bodyClientId,
    lineas_productos,
  } = body;

  if (!cliente_nombre)
    return NextResponse.json({ error: "Falta el nombre del cliente" }, { status: 400 });
  if (!importe)
    return NextResponse.json({ error: "El importe es obligatorio" }, { status: 400 });
  if (!equipo_tipo)
    return NextResponse.json({ error: "Selecciona el tipo de equipo" }, { status: 400 });
  if (!plazo_meses)
    return NextResponse.json({ error: "Selecciona el plazo" }, { status: 400 });

  // Get an admin collaborator_id for the operation (required NOT NULL field)
  const [admin] = await db
    .select({ id: collaborators.id })
    .from(collaborators)
    .where(eq(collaborators.role, "admin"))
    .limit(1);
  if (!admin)
    return NextResponse.json({ error: "No se encontró administrador" }, { status: 500 });

  // Get or create client (owned by admin for proveedor-created ops)
  let clientId: string | null = bodyClientId || null;
  if (!clientId) {
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.nombre, cliente_nombre))
      .limit(1);
    if (existingClient) clientId = existingClient.id;
  }

  if (!clientId) {
    const clientCodigo = await generateCodigoCLI();
    const [newClient] = await db
      .insert(clients)
      .values({
        collaborator_id: admin.id,
        nombre: cliente_nombre,
        email: cliente_email || null,
        telefono: cliente_telefono || null,
        web: cliente_web || null,
        cif: cliente_cif || null,
        cnae: cliente_cnae || null,
        provincia: cliente_provincia || null,
        nombre_comercial: cliente_nombre_comercial || null,
        codigo: clientCodigo,
      })
      .returning();
    clientId = newClient.id;
  }

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

  // Auto-generate name
  let displayName = cliente_nombre;
  if (clientId) {
    const [cli] = await db
      .select({ nombre: clients.nombre, nombre_comercial: clients.nombre_comercial })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (cli) displayName = cli.nombre_comercial?.trim() || cli.nombre;
  }

  const [{ count: opCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operations)
    .where(eq(operations.client_id, clientId!));
  const opNum = Number(opCount) + 1;
  const autoNombre = `${displayName} - OP ${opNum}`;

  const opCodigo = await generateCodigoOP(clientId);

  // Proveedor operations go directly to "activa"
  const [op] = await db
    .insert(operations)
    .values({
      collaborator_id: admin.id,
      pipeline_key: "renting",
      nombre: autoNombre,
      client_id: clientId,
      supplier_id: supplierId,
      importe: sanitizeNumeric(importe),
      renting_rol: "proveedor",
      equipo_tipo: equipo_tipo || null,
      plazo_meses: plazo_meses ? parseInt(plazo_meses) : null,
      lugar_entrega: lugar_entrega || null,
      descripcion: [descripcion_equipo, descripcion].filter(Boolean).join("\n\n---\n\n") || null,
      contacto_directo: contacto_directo === "true",
      fase: "Pre-análisis",
      status: "activa",
      codigo: opCodigo,
      fecha_contrato: new Date(),
    })
    .returning();

  if (Array.isArray(lineas_productos)) {
    const manualLines = lineas_productos.filter((l: any) => !l.fromCatalog && l.nombre?.trim());
    if (manualLines.length > 0) {
      const existing = await db
        .select({ nombre: supplierProducts.nombre })
        .from(supplierProducts)
        .where(eq(supplierProducts.supplier_id, supplierId));
      const existingNames = new Set(existing.map((e) => e.nombre.toLowerCase()));

      const newProducts = manualLines
        .filter((l: any) => !existingNames.has(l.nombre.trim().toLowerCase()))
        .map((l: any) => ({
          supplier_id: supplierId,
          nombre: l.nombre.trim(),
          tipo: equipo_tipo || null,
          precio_venta: String(l.precioUnitario),
        }));

      if (newProducts.length > 0) {
        await db.insert(supplierProducts).values(newProducts);
      }
    }
  }

  return NextResponse.json(op, { status: 201 });
}
