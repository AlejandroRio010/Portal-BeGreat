import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collaborators, collaboratorUsers, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const emailNorm = (email ?? "").toLowerCase().trim();

  const ok = NextResponse.json({ ok: true });

  if (!emailNorm) return ok;

  // Try collaborator_users first
  let userId: string | null = null;
  let nombre = "";
  let userEmail = "";

  const [cu] = await db
    .select({
      id: collaboratorUsers.id,
      nombre: collaboratorUsers.nombre,
      email: collaboratorUsers.email,
      activo: collaboratorUsers.activo,
      collaborator_id: collaboratorUsers.collaborator_id,
    })
    .from(collaboratorUsers)
    .where(eq(collaboratorUsers.email, emailNorm))
    .limit(1);

  if (cu && cu.activo) {
    // Check parent collaborator is also active
    const [colab] = await db
      .select({ activo: collaborators.activo })
      .from(collaborators)
      .where(eq(collaborators.id, cu.collaborator_id))
      .limit(1);
    if (colab?.activo) {
      userId = cu.id;
      nombre = cu.nombre;
      userEmail = cu.email;
    }
  }

  // Fallback: admin in collaborators table
  if (!userId) {
    const [user] = await db
      .select({ id: collaborators.id, nombre: collaborators.nombre, email: collaborators.email, activo: collaborators.activo })
      .from(collaborators)
      .where(eq(collaborators.email, emailNorm))
      .limit(1);

    if (user?.activo) {
      userId = user.id;
      nombre = user.nombre;
      userEmail = user.email;
    }
  }

  if (!userId) return ok;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const resetUrl = `${base}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(userEmail, nombre, resetUrl);
  } catch (e) {
    console.error("Error enviando email de reset:", e);
  }

  return ok;
}
