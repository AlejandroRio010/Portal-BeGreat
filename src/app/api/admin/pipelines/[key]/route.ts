import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pipelines } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const { fases } = await req.json();

  if (!Array.isArray(fases) || fases.some((f) => typeof f !== "string" || !f.trim())) {
    return NextResponse.json({ error: "Fases inválidas" }, { status: 400 });
  }

  await db
    .update(pipelines)
    .set({ fases })
    .where(eq(pipelines.key, key as "consultoria" | "renting"));

  return NextResponse.json({ ok: true });
}
