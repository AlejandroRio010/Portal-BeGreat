import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { passwordResetTokens, collaboratorUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sendAccessInviteEmail, sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collaboratorId } = await params;
  const { tipo, enviarEmail, userId } = await req.json();

  // userId = collaborator_user id. Required.
  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const [cu] = await db
    .select({ id: collaboratorUsers.id, nombre: collaboratorUsers.nombre, email: collaboratorUsers.email })
    .from(collaboratorUsers)
    .where(and(eq(collaboratorUsers.id, userId), eq(collaboratorUsers.collaborator_id, collaboratorId)))
    .limit(1);

  if (!cu) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    user_id: cu.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const url = `${base}/reset-password?token=${token}`;

  let emailSent = false;
  if (enviarEmail && cu.email) {
    try {
      if (tipo === "invitacion") {
        await sendAccessInviteEmail(cu.email, cu.nombre, url);
      } else {
        await sendPasswordResetEmail(cu.email, cu.nombre, url);
      }
      emailSent = true;
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  }

  return NextResponse.json({ url, emailSent });
}
