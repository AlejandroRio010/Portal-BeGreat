import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collaborators, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const emailNorm = (email ?? "").toLowerCase().trim();

  // Respuesta siempre igual (no revelamos si el email existe)
  const ok = NextResponse.json({ ok: true });

  if (!emailNorm) return ok;

  const [user] = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, activo: collaborators.activo })
    .from(collaborators)
    .where(eq(collaborators.email, emailNorm))
    .limit(1);

  if (!user || !user.activo) return ok;

  // Generar token, guardar su hash
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await db.insert(passwordResetTokens).values({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const resetUrl = `${base}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, user.nombre, resetUrl);
  } catch (e) {
    console.error("Error enviando email de reset:", e);
    // Aun así devolvemos ok para no filtrar info
  }

  return ok;
}
