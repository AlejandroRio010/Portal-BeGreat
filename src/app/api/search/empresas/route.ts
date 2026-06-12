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

  const apiKey = process.env.APIEMPRESAS_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.apiempresas.es/v1/companies/search?query=${encodeURIComponent(q)}&limit=6`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      console.error("[APIEmpresas] Error:", res.status, await res.text().catch(() => ""));
      return NextResponse.json([]);
    }

    const data = await res.json();
    const companies = (data.results ?? data.data ?? data ?? []).slice(0, 6);

    return NextResponse.json(
      companies.map((c: any) => ({
        cif: c.cif ?? c.nif ?? c.tax_id ?? null,
        nombre: c.name ?? c.nombre ?? c.razon_social ?? null,
        direccion: c.address ?? c.direccion ?? null,
        provincia: c.province ?? c.provincia ?? null,
        cnae: c.cnae ?? c.cnae_code ?? null,
      }))
    );
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
