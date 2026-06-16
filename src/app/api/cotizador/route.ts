import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cotizadorDeals } from "@/db/schema";

function findTae(importe: number, meses: number, cuota: number): number {
  let lo = 0.001, hi = 0.60;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const r = mid / 12;
    const c = importe * (r / (1 - Math.pow(1 + r, -meses)));
    if (c < cuota) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const PLAZOS = [24, 36, 48, 60, 72];

const FALLBACK: Record<string, { meses: number; tae: number }[]> = {
  grenke: [
    { meses: 24, tae: 0.226 },
    { meses: 36, tae: 0.200 },
    { meses: 48, tae: 0.171 },
    { meses: 60, tae: 0.161 },
    { meses: 72, tae: 0.148 },
  ],
  laboral_kutxa: [
    { meses: 24, tae: 0.128 },
    { meses: 36, tae: 0.118 },
    { meses: 48, tae: 0.110 },
    { meses: 60, tae: 0.105 },
    { meses: 72, tae: 0.098 },
  ],
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await db.select().from(cotizadorDeals);

  const byEntidad: Record<string, { importe: number; cuota: number; plazo: number }[]> = {};
  for (const d of deals) {
    if (!byEntidad[d.entidad]) byEntidad[d.entidad] = [];
    byEntidad[d.entidad].push({
      importe: Number(d.importe),
      cuota: Number(d.cuota),
      plazo: d.plazo_meses,
    });
  }

  const result: Record<string, { meses: number; tae: number }[]> = {};

  for (const entidad of Object.keys({ ...byEntidad, ...FALLBACK })) {
    const entDeals = byEntidad[entidad] || [];
    const taeByPlazo: Record<number, number[]> = {};
    for (const d of entDeals) {
      const tae = findTae(d.importe, d.plazo, d.cuota);
      if (!taeByPlazo[d.plazo]) taeByPlazo[d.plazo] = [];
      taeByPlazo[d.plazo].push(tae);
    }

    const allTaes = entDeals.map(d => findTae(d.importe, d.plazo, d.cuota));
    const globalAvg = allTaes.length > 0 ? allTaes.reduce((a, b) => a + b, 0) / allTaes.length : null;

    const fb = FALLBACK[entidad] || [];
    result[entidad] = PLAZOS.map(p => {
      if (taeByPlazo[p] && taeByPlazo[p].length > 0) {
        return { meses: p, tae: taeByPlazo[p].reduce((a, b) => a + b, 0) / taeByPlazo[p].length };
      }
      const fbEntry = fb.find(f => f.meses === p);
      if (fbEntry) return fbEntry;
      if (globalAvg !== null) return { meses: p, tae: globalAvg };
      return { meses: p, tae: 0.10 };
    });
  }

  return NextResponse.json(result);
}
