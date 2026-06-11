import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

  await db.insert(passwordResetTokens).values({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const url = `${base}/reset-password?token=${token}`;

  return NextResponse.json({ url });
}
