import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collaborators, collaboratorUsers, passwordResetTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token_hash, tokenHash), eq(passwordResetTokens.used, false)))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "El enlace no es válido o ya se usó." }, { status: 400 });
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "El enlace ha caducado. Solicita uno nuevo." }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Try collaborator_users first, then collaborators (admin)
  const [cu] = await db
    .select({ id: collaboratorUsers.id })
    .from(collaboratorUsers)
    .where(eq(collaboratorUsers.id, record.user_id))
    .limit(1);

  if (cu) {
    await db.update(collaboratorUsers).set({ password_hash }).where(eq(collaboratorUsers.id, record.user_id));
  } else {
    await db.update(collaborators).set({ password_hash }).where(eq(collaborators.id, record.user_id));
  }

  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, record.id));

  return NextResponse.json({ ok: true });
}
