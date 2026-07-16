import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { and, isNotNull, ne } from "drizzle-orm";
import { getFacturasVenta, categoriaPorPipeline, type CategoriaIngreso } from "@/lib/holded";

export const dynamic = "force-dynamic";

/** Normaliza para comparar nombres (sin acentos, sin puntuación, minúsculas). */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(sa|sl|slu|sau|coop|inc|llc|de|credito|popular)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
/** ¿El nombre de una factura casa con la contraparte esperada (entidad/cliente)? */
function mismaContraparte(contacto: string, esperada: string): boolean {
  const a = norm(contacto), b = norm(esperada);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  // Coincidencia por primera palabra significativa (Grenke, Tendit, Cibernos…)
  const primera = b.split(" ")[0];
  return primera.length >= 4 && a.includes(primera);
}

// Buscador de facturas de venta de Holded para vincular a una operación.
// - Excluye las ya vinculadas a cualquier operación.
// - Por defecto filtra por la cuenta contable de la línea (según pipeline) y,
//   si se pasa, por la contraparte (entidad financiera / cliente de la op).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const pipeline = p.get("pipeline");
  const q = (p.get("q") ?? "").toLowerCase().trim();
  const todas = p.get("todas") === "1";
  const opId = p.get("opId") ?? "";
  const contraparte = (p.get("contraparte") ?? "").trim(); // entidad o cliente según pipeline
  // Importe esperado SIN IVA (el fee o el importe facturado por BeGreat).
  // Las facturas de Holded llevan el IVA incluido, así que comparamos contra
  // el importe base y también contra base+21% (y cubrimos exentos de IVA).
  const esperadoBase = parseFloat(p.get("esperado") ?? "") || 0;
  const esperadoConIva = esperadoBase * 1.21;

  let facturas;
  try {
    facturas = await getFacturasVenta();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error Holded" }, { status: 502 });
  }

  // Facturas de cobro ya vinculadas a OTRA operación → fuera del listado
  const ligadas = await db
    .select({ id: operations.holded_invoice_id })
    .from(operations)
    .where(opId ? and(isNotNull(operations.holded_invoice_id), ne(operations.id, opId)) : isNotNull(operations.holded_invoice_id));
  const usadas = new Set(ligadas.map(r => r.id).filter(Boolean) as string[]);

  const cat: CategoriaIngreso | null = categoriaPorPipeline(pipeline);
  let out = facturas.filter(f => !usadas.has(f.id));
  if (!todas) {
    if (cat) out = out.filter(f => f.categoria === cat);
    if (contraparte) out = out.filter(f => mismaContraparte(f.contact_name, contraparte));
  }
  if (q) {
    out = out.filter(f =>
      f.contact_name.toLowerCase().includes(q) ||
      f.document_number.toLowerCase().includes(q) ||
      (f.description ?? "").toLowerCase().includes(q)
    );
  }

  // Las que cuadran con el importe esperado (base o base+IVA) primero
  const cerca = (t: number, v: number) => v > 0 && Math.abs(t - v) <= Math.max(1, v * 0.015);
  const coincide = (t: number) => cerca(t, esperadoBase) || cerca(t, esperadoConIva);
  out.sort((a, b) => Number(coincide(b.total)) - Number(coincide(a.total)));

  return NextResponse.json(
    out.slice(0, 40).map(f => ({
      id: f.id,
      numero: f.document_number,
      cliente: f.contact_name,
      descripcion: f.description,
      fecha: f.date,
      total: f.total,
      estado: f.estado,
      fecha_cobro: f.fecha_cobro,
      categoria: f.categoria,
      coincide_importe: coincide(f.total),
    }))
  );
}
