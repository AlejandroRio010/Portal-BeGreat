import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, suppliers, operations } from "@/db/schema";
import { eq } from "drizzle-orm";

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "en", "y", "e", "a", "con", "para", "por", "al", "un", "una"]);

function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^a-záéíóúñü]/gi, "");
  return letters.length > 2 && letters === letters.toUpperCase();
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (i > 0 && LOWERCASE_WORDS.has(w)) return w;
      if (w.length <= 3 && /^[a-z]+$/.test(w) && !LOWERCASE_WORDS.has(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fixes: { table: string; id: string; old: string; new: string }[] = [];

  const allClients = await db.select({ id: clients.id, nombre: clients.nombre, nombre_comercial: clients.nombre_comercial }).from(clients);
  for (const c of allClients) {
    if (isAllCaps(c.nombre)) {
      const fixed = toTitleCase(c.nombre);
      await db.update(clients).set({ nombre: fixed }).where(eq(clients.id, c.id));
      fixes.push({ table: "clients", id: c.id, old: c.nombre, new: fixed });
    }
    if (c.nombre_comercial && isAllCaps(c.nombre_comercial)) {
      const fixed = toTitleCase(c.nombre_comercial);
      await db.update(clients).set({ nombre_comercial: fixed }).where(eq(clients.id, c.id));
      fixes.push({ table: "clients.nombre_comercial", id: c.id, old: c.nombre_comercial, new: fixed });
    }
  }

  const allSuppliers = await db.select({ id: suppliers.id, nombre: suppliers.nombre, nombre_comercial: suppliers.nombre_comercial }).from(suppliers);
  for (const s of allSuppliers) {
    if (isAllCaps(s.nombre)) {
      const fixed = toTitleCase(s.nombre);
      await db.update(suppliers).set({ nombre: fixed }).where(eq(suppliers.id, s.id));
      fixes.push({ table: "suppliers", id: s.id, old: s.nombre, new: fixed });
    }
    if (s.nombre_comercial && isAllCaps(s.nombre_comercial)) {
      const fixed = toTitleCase(s.nombre_comercial);
      await db.update(suppliers).set({ nombre_comercial: fixed }).where(eq(suppliers.id, s.id));
      fixes.push({ table: "suppliers.nombre_comercial", id: s.id, old: s.nombre_comercial, new: fixed });
    }
  }

  const allOps = await db.select({ id: operations.id, nombre: operations.nombre }).from(operations);
  for (const o of allOps) {
    if (o.nombre && isAllCaps(o.nombre)) {
      const fixed = toTitleCase(o.nombre);
      await db.update(operations).set({ nombre: fixed }).where(eq(operations.id, o.id));
      fixes.push({ table: "operations", id: o.id, old: o.nombre, new: fixed });
    }
  }

  return NextResponse.json({ total: fixes.length, fixes });
}
