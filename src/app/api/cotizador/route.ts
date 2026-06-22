import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PLAZOS = [24, 36, 48, 60, 72];

// TAEs calibrados con datos reales del mercado español de renting
const TAES: Record<string, { meses: number; tae: number }[]> = {
  laboral_kutxa: [
    { meses: 24, tae: 0.105 },
    { meses: 36, tae: 0.100 },
    { meses: 48, tae: 0.0957 },
    { meses: 60, tae: 0.0983 },
    { meses: 72, tae: 0.095 },
  ],
  grenke: [
    { meses: 24, tae: 0.228 },
    { meses: 36, tae: 0.2017 },
    { meses: 48, tae: 0.1734 },
    { meses: 60, tae: 0.1684 },
    { meses: 72, tae: 0.1475 },
  ],
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(TAES);
}
