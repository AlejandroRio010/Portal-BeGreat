import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PLAZOS = [24, 36, 48, 60, 72];

// TAEs calibrados con datos reales del mercado español de renting
const TAES: Record<string, { meses: number; tae: number }[]> = {
  laboral_kutxa: [
    { meses: 24, tae: 0.060 },
    { meses: 36, tae: 0.055 },
    { meses: 48, tae: 0.050 },
    { meses: 60, tae: 0.048 },
    { meses: 72, tae: 0.045 },
  ],
  grenke: [
    { meses: 24, tae: 0.225 },
    { meses: 36, tae: 0.195 },
    { meses: 48, tae: 0.165 },
    { meses: 60, tae: 0.150 },
    { meses: 72, tae: 0.140 },
  ],
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(TAES);
}
