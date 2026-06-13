import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://apiempresas.es/search?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-Search-Origin": "web-search",
        },
      }
    );

    if (!res.ok) {
      console.error("[APIEmpresas] Error:", res.status);
      return NextResponse.json([]);
    }

    const data = await res.json();
    if (!data.success || !data.data) return NextResponse.json([]);

    const c = data.data;
    return NextResponse.json([{
      cif: c.cif ?? c.nif ?? null,
      nombre: c.name ?? null,
      direccion: c.address ?? null,
      provincia: c.province ?? null,
      cnae: c.cnae_2025 ?? c.cnae ?? null,
      cnae_label: c.cnae_2025_label ?? c.cnae_label ?? null,
      telefono: c.phone ?? c.phone_enriched ?? c.phone_mobile ?? c.phone_mobile_enriched ?? null,
      email: c.email ?? null,
      web: c.website_official ?? null,
    }]);
  } catch (err: any) {
    console.error("[APIEmpresas] Fetch error:", err.message);
    return NextResponse.json([]);
  }
}

// Check if CIF already exists in our DB
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cif } = await req.json();
  if (!cif?.trim()) return NextResponse.json({ exists: false });

  const [existing] = await db
    .select({ id: clients.id, nombre: clients.nombre })
    .from(clients)
    .where(eq(clients.cif, cif.trim().toUpperCase()))
    .limit(1);

  return NextResponse.json({
    exists: !!existing,
    nombre: existing?.nombre ?? null,
  });
}
