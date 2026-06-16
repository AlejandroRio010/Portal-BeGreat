import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { passwordResetTokens, supplierUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sendAccessInviteEmail, sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: supplierId } = await params;
  const { tipo, enviarEmail, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const [su] = await db
    .select({ id: supplierUsers.id, nombre: supplierUsers.nombre, email: supplierUsers.email })
    .from(supplierUsers)
    .where(and(eq(supplierUsers.id, userId), eq(supplierUsers.supplier_id, supplierId)))
    .limit(1);

  if (!su) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    user_id: su.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const base = process.env.NEXTAUTH_URL || "https://portal.begreatconsulting.es";
  const url = `${base}/reset-password?token=${token}`;

  let emailSent = false;
  if (enviarEmail && su.email) {
    try {
      if (tipo === "invitacion") {
        await sendAccessInviteEmail(su.email, su.nombre, url);
      } else {
        await sendPasswordResetEmail(su.email, su.nombre, url);
      }
      emailSent = true;
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  }

  return NextResponse.json({ url, emailSent });
}
