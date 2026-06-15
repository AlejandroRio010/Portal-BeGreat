import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationDocuments, clientDocuments, avalDocuments, operations, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { downloadFile } from "@/lib/onedrive";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = req.nextUrl.searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Falta docId" }, { status: 400 });

  const userId = ((session.user as any).collaboratorId ?? session.user?.id) as string;
  const role = (session.user as any).role;

  type DocRow = { filename: string; url: string };
  let doc: DocRow | undefined;

  // 1) Try operation_documents — verify user owns the operation (or is admin)
  const [opDoc] = await db
    .select({ filename: operationDocuments.filename, url: operationDocuments.url, operation_id: operationDocuments.operation_id })
    .from(operationDocuments).where(eq(operationDocuments.id, docId)).limit(1);
  if (opDoc) {
    if (role !== "admin") {
      const [op] = await db.select({ id: operations.id }).from(operations)
        .where(and(eq(operations.id, opDoc.operation_id), eq(operations.collaborator_id, userId))).limit(1);
      if (!op) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    doc = { filename: opDoc.filename, url: opDoc.url };
  }

  // 2) Try client_documents — verify user owns the client (or is admin)
  if (!doc) {
    const [cDoc] = await db
      .select({ filename: clientDocuments.filename, url: clientDocuments.url, client_id: clientDocuments.client_id })
      .from(clientDocuments).where(eq(clientDocuments.id, docId)).limit(1);
    if (cDoc) {
      if (role !== "admin") {
        const [cl] = await db.select({ id: clients.id }).from(clients)
          .where(and(eq(clients.id, cDoc.client_id), eq(clients.collaborator_id, userId))).limit(1);
        if (!cl) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      }
      doc = { filename: cDoc.filename, url: cDoc.url };
    }
  }

  // 3) Try aval_documents — verify user owns the operation (or is admin)
  if (!doc) {
    const [aDoc] = await db
      .select({ filename: avalDocuments.filename, url: avalDocuments.url, operation_id: avalDocuments.operation_id })
      .from(avalDocuments).where(eq(avalDocuments.id, docId)).limit(1);
    if (aDoc) {
      if (role !== "admin") {
        const [op] = await db.select({ id: operations.id }).from(operations)
          .where(and(eq(operations.id, aDoc.operation_id), eq(operations.collaborator_id, userId))).limit(1);
        if (!op) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      }
      doc = { filename: aDoc.filename, url: aDoc.url };
    }
  }

  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

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
