import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") ?? "documento";

  if (!url || !url.startsWith("https://res.cloudinary.com/")) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const fileRes = await fetch(url);
  if (!fileRes.ok) return NextResponse.json({ error: "No se pudo obtener el archivo" }, { status: 502 });

  const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream";
  const buffer = await fileRes.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
