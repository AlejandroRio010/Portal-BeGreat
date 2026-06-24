import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUploadSession } from "@/lib/onedrive";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, folder } = await req.json();
  if (!filename) return NextResponse.json({ error: "No filename" }, { status: 400 });

  const folderPath = folder || "Sin clasificar";

  try {
    const { uploadUrl } = await createUploadSession(folderPath, filename);
    return NextResponse.json({ uploadUrl, filename });
  } catch (e: any) {
    console.error("Upload session error:", e);
    return NextResponse.json({ error: e.message ?? "Error al crear sesión" }, { status: 500 });
  }
}
