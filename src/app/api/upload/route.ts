import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/onedrive";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  // Un archivo vacío no se sube jamás: suele ser un placeholder de iCloud/OneDrive
  // sin descargar en el ordenador del usuario, o un archivo a medio bajar.
  if (buffer.length === 0) {
    return NextResponse.json(
      { error: `"${file.name}" está vacío (0 KB). Ábrelo en tu ordenador para que se descargue del todo y vuelve a subirlo.` },
      { status: 400 }
    );
  }
  const folderPath = folder || "Sin clasificar";

  try {
    const itemId = await uploadFile(folderPath, file.name, buffer);
    return NextResponse.json({
      url: `onedrive:${itemId}`,
      filename: file.name,
      size: file.size,
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message ?? "Error al subir" }, { status: 500 });
  }
}
