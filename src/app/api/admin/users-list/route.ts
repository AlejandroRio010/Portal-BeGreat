import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db
    .select({ id: collaborators.id, nombre: collaborators.nombre, role: collaborators.role })
    .from(collaborators)
    .orderBy(collaborators.nombre);

  return NextResponse.json(users);
}
