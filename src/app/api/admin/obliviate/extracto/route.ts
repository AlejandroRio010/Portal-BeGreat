import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";
import { categoriaDeMovimiento } from "@/lib/obliviate";

// Importa un extracto del Sabadell de Obliviate (XLS de "Consulta de
// movimientos"). Deduplica por (fecha, concepto, importe, saldo), así se puede
// re-subir el mismo extracto o uno solapado sin miedo.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("extracto");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el fichero" }, { status: 400 });

  let filas: unknown[][];
  try {
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
  } catch {
    return NextResponse.json({ error: "No se pudo leer el fichero — ¿es el XLS de 'Consulta de movimientos' del Sabadell?" }, { status: 400 });
  }

  // Cabecera: fila con "F. Operativa" | Concepto | F. Valor | Importe | Saldo
  const iCab = filas.findIndex(f => String(f?.[0] ?? "").trim().toLowerCase().startsWith("f. operativa"));
  if (iCab < 0) return NextResponse.json({ error: "No encuentro la cabecera 'F. Operativa' — formato inesperado" }, { status: 400 });

  const num = (v: unknown) => {
    const s = String(v ?? "").replace(/\./g, m => (String(v).includes(",") ? "" : m)).replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  const movs: { fecha: string; concepto: string; importe: number; saldo: number | null }[] = [];
  for (const f of filas.slice(iCab + 1)) {
    const fechaRaw = String(f?.[0] ?? "").trim();
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(fechaRaw);
    if (!m) continue;
    const importe = num(f?.[3]);
    if (importe == null) continue;
    movs.push({
      fecha: `${m[3]}-${m[2]}-${m[1]}`,
      concepto: String(f?.[1] ?? "").trim(),
      importe: Math.round(importe * 100) / 100,
      saldo: num(f?.[4]),
    });
  }
  if (!movs.length) return NextResponse.json({ error: "El fichero no tiene movimientos" }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!);
  let nuevos = 0;
  for (const mv of movs) {
    const categoria = categoriaDeMovimiento(mv.concepto, mv.importe);
    const r = await sql`INSERT INTO obliviate_movs (fecha, concepto, importe, saldo, categoria)
      VALUES (${mv.fecha}, ${mv.concepto}, ${String(mv.importe)}, ${mv.saldo != null ? String(mv.saldo) : null}, ${categoria})
      ON CONFLICT (fecha, concepto, importe, coalesce(saldo, 0)) DO NOTHING RETURNING id`;
    if (r.length) nuevos++;
  }
  return NextResponse.json({ leidos: movs.length, nuevos, duplicados: movs.length - nuevos });
}
