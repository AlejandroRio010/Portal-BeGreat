import { db } from "@/db";
import { collaborators, clients, suppliers, operations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/** Genera COL-001, COL-002… */
export async function generateCodigoCOL(): Promise<string> {
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0)` })
    .from(collaborators)
    .where(sql`codigo IS NOT NULL AND codigo LIKE 'COL-%'`);
  return `COL-${String((max ?? 0) + 1).padStart(3, "0")}`;
}

/** Genera CLI-001, CLI-042… */
export async function generateCodigoCLI(): Promise<string> {
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0)` })
    .from(clients)
    .where(sql`codigo IS NOT NULL AND codigo LIKE 'CLI-%'`);
  return `CLI-${String((max ?? 0) + 1).padStart(3, "0")}`;
}

/** Genera PRV-001, PRV-002… */
export async function generateCodigoPRV(): Promise<string> {
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0)` })
    .from(suppliers)
    .where(sql`codigo IS NOT NULL AND codigo LIKE 'PRV-%'`);
  return `PRV-${String((max ?? 0) + 1).padStart(3, "0")}`;
}

/**
 * Genera OP-042-01:
 * - 042 = número del cliente (de su código CLI-042)
 * - 01  = nº de op de ese cliente (secuencial)
 */
export async function generateCodigoOP(clientId: string | null): Promise<string> {
  let clientNum = "000";
  if (clientId) {
    const [client] = await db
      .select({ codigo: clients.codigo })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (client?.codigo) {
      clientNum = client.codigo.replace("CLI-", "");
    }
  }

  // Count existing ops for this client
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(operations)
    .where(clientId ? eq(operations.client_id, clientId) : sql`client_id IS NULL`);

  const seq = (Number(count) + 1);
  return `OP-${clientNum}-${String(seq).padStart(2, "0")}`;
}
