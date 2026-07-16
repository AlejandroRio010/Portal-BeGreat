import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { ne } from "drizzle-orm";
import { getGastos } from "@/lib/holded";

export const dynamic = "force-dynamic";

/** Normaliza para comparar nombres (sin acentos, sin puntuación, minúsculas). */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(sa|sl|slu|sau|coop|inc|llc|de|servicios|global|consultores)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
/** ¿El proveedor de una compra casa con la contraparte esperada? */
function mismaContraparte(contacto: string, esperada: string): boolean {
  const a = norm(contacto), b = norm(esperada);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const primera = b.split(" ")[0];
  return primera.length >= 4 && a.includes(primera);
}

// Buscador de facturas de COMPRA de Holded para vincular al pago de una operación
// (pago a proveedor/cliente por mercadería, o pago de comisión a un colaborador).
// - Excluye las ya vinculadas a cualquier operación.
// - Filtra por contraparte (nombre del que cobra) salvo que se pida "todas".
// - Ordena primero las que cuadran con el importe esperado (sin IVA), teniendo
//   en cuenta el IVA (21%) y, para autónomos, la retención de IRPF (7%).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const q = (p.get("q") ?? "").toLowerCase().trim();
  const todas = p.get("todas") === "1";
  const opId = p.get("opId") ?? "";
  const contraparte = (p.get("contraparte") ?? "").trim();
  const esperadoBase = parseFloat(p.get("esperado") ?? "") || 0;
  // Total posible de una factura según el importe base (sin IVA):
  //  · exento de IVA: base
  //  · con IVA 21%: base * 1.21
  //  · autónomo (IVA 21% − IRPF 7%): base * 1.14
  const objetivos = [esperadoBase, esperadoBase * 1.21, esperadoBase * 1.14];

  let gastos;
  try {
    gastos = await getGastos({ incluirBorradores: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error Holded" }, { status: 502 });
  }

  // Compras ya vinculadas a OTRA operación → fuera del listado
  const ops = await db
    .select({ id: operations.id, purchases: operations.holded_purchases })
    .from(operations)
    .where(opId ? ne(operations.id, opId) : undefined);
  const usadas = new Set<string>();
  for (const o of ops) {
    for (const f of (o.purchases as { id?: string }[] | null) ?? []) if (f?.id) usadas.add(f.id);
  }

  let out = gastos.filter(g => !usadas.has(g.id));
  if (!todas && contraparte) out = out.filter(g => mismaContraparte(g.proveedor, contraparte));
  if (q) {
    out = out.filter(g =>
      g.proveedor.toLowerCase().includes(q) ||
      g.document_number.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q)
    );
  }

  const cerca = (t: number, v: number) => v > 0 && Math.abs(t - v) <= Math.max(1, v * 0.02);
  const coincide = (t: number) => objetivos.some(v => cerca(t, v));
  out.sort((a, b) => Number(coincide(b.total)) - Number(coincide(a.total)));

  return NextResponse.json(
    out.slice(0, 40).map(g => ({
      id: g.id,
      numero: g.document_number,
      proveedor: g.proveedor,
      descripcion: g.description,
      fecha: g.date,
      total: g.total,
      retencion: g.retencion,
      estado: g.estado,
      fecha_pago: g.fecha_pago,
      categoria: g.categoria,
      coincide_importe: coincide(g.total),
    }))
  );
}
