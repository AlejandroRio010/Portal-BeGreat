import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { passwordResetTokens, collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendAccessInviteEmail, sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  const { tipo, enviarEmail } = await req.json();

  const [colab] = await db
    .select({ nombre: collaborators.nombre, email: collaborators.email })
    .from(collaborators).where(eq(collaborators.id, userId)).limit(1);

  if (!colab) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const url = `${base}/reset-password?token=${token}`;

  let emailSent = false;
  if (enviarEmail && colab.email) {
    try {
      if (tipo === "invitacion") {
        await sendAccessInviteEmail(colab.email, colab.nombre, url);
      } else {
        await sendPasswordResetEmail(colab.email, colab.nombre, url);
      }
      emailSent = true;
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  }

  return NextResponse.json({ url, emailSent });
}
