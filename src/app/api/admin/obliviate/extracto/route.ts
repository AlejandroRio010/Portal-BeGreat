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
  // Un extracto del banco pesa unos KB; topamos a 5 MB para no cargar en
  // memoria un fichero enorme (defensa frente a DoS por subida).
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El fichero es demasiado grande (máx. 5 MB)" }, { status: 400 });

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

  // Parser robusto de importes: admite formato español (1.000,00) y anglosajón
  // (1,000.00). El separador decimal es el símbolo (. o ,) que esté más a la
  // derecha; el otro es separador de miles y se elimina. Sabadell exporta en
  // formato anglosajón, así que -1,000.00 debe leerse como -1000, no como -1.
  const num = (v: unknown) => {
    let s = String(v ?? "").trim().replace(/\s/g, "");
    if (!s) return null;
    const neg = /^-/.test(s) || /-$/.test(s);
    s = s.replace(/[^\d.,]/g, "");
    if (!s) return null;
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decPos = Math.max(lastComma, lastDot);
    if (decPos >= 0) {
      const decChar = s[decPos];
      const decimales = s.slice(decPos + 1);
      // Si tras el último separador hay 3 dígitos, es separador de miles (sin decimales)
      if (/^\d{3}$/.test(decimales)) {
        s = s.replace(/[.,]/g, "");
      } else {
        const milesChar = decChar === "," ? "." : ",";
        s = s.split(milesChar).join("").replace(decChar, ".");
      }
    }
    let n = parseFloat(s);
    if (!Number.isFinite(n)) return null;
    if (neg) n = -Math.abs(n);
    return n;
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
