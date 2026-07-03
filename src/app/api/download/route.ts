import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationDocuments, clientDocuments, avalDocuments, supplierDocuments, operations, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { downloadFile } from "@/lib/onedrive";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = req.nextUrl.searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Falta docId" }, { status: 400 });

  const role = (session.user as any).role;
  const collaboratorId = (session.user as any).collaboratorId as string | undefined;
  const supplierId = (session.user as any).supplierId as string | undefined;

  // Un no-admin puede acceder a una operación si es suya (colaborador) o está asignada a él (proveedor)
  async function canAccessOperation(operationId: string): Promise<boolean> {
    if (role === "admin") return true;
    const cond = role === "proveedor"
      ? and(eq(operations.id, operationId), eq(operations.supplier_id, supplierId ?? ""))
      : and(eq(operations.id, operationId), eq(operations.collaborator_id, collaboratorId ?? ""));
    const [op] = await db.select({ id: operations.id }).from(operations).where(cond).limit(1);
    return !!op;
  }

  // Acceso a un cliente: dueño de la ficha, o tener alguna operación con ese cliente
  async function canAccessClient(clientId: string): Promise<boolean> {
    if (role === "admin") return true;
    if (role === "proveedor") {
      const [op] = await db.select({ id: operations.id }).from(operations)
        .where(and(eq(operations.client_id, clientId), eq(operations.supplier_id, supplierId ?? ""))).limit(1);
      return !!op;
    }
    const [cl] = await db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.collaborator_id, collaboratorId ?? ""))).limit(1);
    if (cl) return true;
    const [op] = await db.select({ id: operations.id }).from(operations)
      .where(and(eq(operations.client_id, clientId), eq(operations.collaborator_id, collaboratorId ?? ""))).limit(1);
    return !!op;
  }

  type DocRow = { filename: string; url: string };
  let doc: DocRow | undefined;

  // 1) Try operation_documents
  const [opDoc] = await db
    .select({ filename: operationDocuments.filename, url: operationDocuments.url, operation_id: operationDocuments.operation_id })
    .from(operationDocuments).where(eq(operationDocuments.id, docId)).limit(1);
  if (opDoc) {
    if (!(await canAccessOperation(opDoc.operation_id)))
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    doc = { filename: opDoc.filename, url: opDoc.url };
  }

  // 2) Try client_documents
  if (!doc) {
    const [cDoc] = await db
      .select({ filename: clientDocuments.filename, url: clientDocuments.url, client_id: clientDocuments.client_id })
      .from(clientDocuments).where(eq(clientDocuments.id, docId)).limit(1);
    if (cDoc) {
      if (!(await canAccessClient(cDoc.client_id)))
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      doc = { filename: cDoc.filename, url: cDoc.url };
    }
  }

  // 3) Try aval_documents
  if (!doc) {
    const [aDoc] = await db
      .select({ filename: avalDocuments.filename, url: avalDocuments.url, operation_id: avalDocuments.operation_id })
      .from(avalDocuments).where(eq(avalDocuments.id, docId)).limit(1);
    if (aDoc) {
      if (!(await canAccessOperation(aDoc.operation_id)))
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      doc = { filename: aDoc.filename, url: aDoc.url };
    }
  }

  // 4) Try supplier_documents — admin o el propio proveedor
  if (!doc) {
    const [sDoc] = await db
      .select({ filename: supplierDocuments.filename, url: supplierDocuments.url, supplier_id: supplierDocuments.supplier_id })
      .from(supplierDocuments).where(eq(supplierDocuments.id, docId)).limit(1);
    if (sDoc) {
      const own = role === "proveedor" && supplierId && sDoc.supplier_id === supplierId;
      if (role !== "admin" && !own) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      doc = { filename: sDoc.filename, url: sDoc.url };
    }
  }

  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Documentos antiguos con URL pública (Cloudinary)
  if (doc.url.startsWith("http")) {
    return NextResponse.redirect(doc.url);
  }

  if (doc.url.startsWith("onedrive:")) {
    const itemId = doc.url.slice("onedrive:".length);
    try {
      const { buffer, contentType } = await downloadFile(itemId);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${doc.filename}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch {
      return NextResponse.json({ error: "Error descargando de OneDrive" }, { status: 500 });
    }
  }

  const match = doc.url.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return NextResponse.json({ error: "Formato inválido" }, { status: 500 });

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) return NextResponse.json({ error: "Archivo vacío" }, { status: 500 });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
