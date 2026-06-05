import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operationDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = req.nextUrl.searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Falta docId" }, { status: 400 });

  const [doc] = await db.select().from(operationDocuments).where(eq(operationDocuments.id, docId)).limit(1);
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  console.log("[download] docId:", docId, "filename:", doc.filename, "url length:", doc.url.length, "url starts:", doc.url.substring(0, 30));

  // Parse base64 data URI: "data:<mime>;base64,<data>"
  const match = doc.url.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    console.log("[download] no match — not a data URI, url starts with:", doc.url.substring(0, 50));
    return NextResponse.json({ error: "No es data URI", urlStart: doc.url.substring(0, 50), urlLen: doc.url.length }, { status: 500 });
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  console.log("[download] mime:", mimeType, "buffer bytes:", buffer.length);

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Buffer vacío", mimeType, urlLen: doc.url.length }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
