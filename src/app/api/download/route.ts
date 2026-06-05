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

  // Parse base64 data URI: "data:<mime>;base64,<data>"
  const match = doc.url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // Legacy URL — redirect to it
    return NextResponse.redirect(doc.url);
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = doc.filename.split(".").pop() ?? "bin";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
