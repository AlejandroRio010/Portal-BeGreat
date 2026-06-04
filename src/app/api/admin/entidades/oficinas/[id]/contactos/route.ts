import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityOfficeContacts } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: office_id } = await params;
  const { nombre, rol, email, telefono, linkedin } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

  const [created] = await db.insert(entityOfficeContacts).values({
    office_id, nombre: nombre.trim(), rol: rol || null,
    email: email || null, telefono: telefono || null, linkedin: linkedin || null,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
