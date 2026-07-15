import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFacturasVenta, categoriaPorPipeline, type CategoriaIngreso } from "@/lib/holded";

export const dynamic = "force-dynamic";

// Buscador de facturas de venta de Holded para vincular a una operación.
// Filtra por la cuenta contable de la línea de negocio (según pipeline) y por texto.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipeline = req.nextUrl.searchParams.get("pipeline");
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase().trim();
  const todas = req.nextUrl.searchParams.get("todas") === "1";

  let facturas;
  try {
    facturas = await getFacturasVenta();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error Holded" }, { status: 502 });
  }

  const cat: CategoriaIngreso | null = categoriaPorPipeline(pipeline);
  let filtradas = facturas;
  if (!todas && cat) filtradas = filtradas.filter(f => f.categoria === cat);
  if (q) {
    filtradas = filtradas.filter(f =>
      f.contact_name.toLowerCase().includes(q) ||
      f.document_number.toLowerCase().includes(q) ||
      (f.description ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json(
    filtradas.slice(0, 40).map(f => ({
      id: f.id,
      numero: f.document_number,
      cliente: f.contact_name,
      descripcion: f.description,
      fecha: f.date,
      total: f.total,
      estado: f.estado,
      fecha_cobro: f.fecha_cobro,
      categoria: f.categoria,
    }))
  );
}
