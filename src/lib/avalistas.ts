import { randomUUID } from "crypto";
import { db } from "@/db";
import { contacts, clients, operations } from "@/db/schema";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { formatDocId } from "@/lib/format";

/** Condición SQL: la operación tiene a este cliente como avalista (legacy o lista). */
export function avalClientCond(clientId: string): SQL {
  return sql`(${operations.aval_client_id} = ${clientId} OR ${operations.avalistas} @> ${JSON.stringify([{ client_id: clientId }])}::jsonb)`;
}

/** Condición SQL: la operación tiene a este contacto como avalista (legacy o lista). */
export function avalContactCond(contactId: string): SQL {
  return sql`(${operations.aval_contact_id} = ${contactId} OR ${operations.avalistas} @> ${JSON.stringify([{ contact_id: contactId }])}::jsonb)`;
}

export interface AvalistaInput {
  /** Clave estable del avalista (vincula sus documentos); se genera si no llega */
  key?: string | null;
  tipo: "persona_fisica" | "empresa";
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  persona_contacto?: string | null;
  dni?: string | null;
  empresa?: string | null;
  contact_id?: string | null;
  client_id?: string | null;
  // Solo para alta de empresa avalista nueva
  cif?: string | null;
  direccion?: string | null;
  cnae?: string | null;
  web?: string | null;
}

export interface AvalistaStored {
  key: string;
  tipo: "persona_fisica" | "empresa";
  nombre: string;
  email: string | null;
  telefono: string | null;
  persona_contacto: string | null;
  dni: string | null;
  empresa: string | null;
  contact_id: string | null;
  client_id: string | null;
}

/**
 * Normaliza la lista de avalistas y auto-crea/vincula contactos (persona física)
 * o empresas (clients) igual que hacía la lógica de aval único.
 */
export async function resolveAvalistas(
  input: AvalistaInput[],
  opClientId: string | null,
  ownerCollaboratorId: string | null,
): Promise<AvalistaStored[]> {
  const out: AvalistaStored[] = [];
  for (const a of input) {
    if (!a || (a.tipo !== "persona_fisica" && a.tipo !== "empresa")) continue;
    const nombre = a.nombre?.trim();
    if (!nombre) continue;

    if (a.tipo === "persona_fisica") {
      let contactId = a.contact_id || null;
      if (!contactId && opClientId) {
        const [existing] = await db.select({ id: contacts.id }).from(contacts)
          .where(and(eq(contacts.client_id, opClientId), eq(contacts.nombre, nombre))).limit(1);
        if (existing) {
          contactId = existing.id;
        } else {
          const [nc] = await db.insert(contacts).values({
            client_id: opClientId,
            nombre,
            email: a.email || null,
            telefono: a.telefono || null,
            rol: a.persona_contacto || null,
          }).returning();
          contactId = nc.id;
        }
      }
      out.push({
        key: a.key || randomUUID(),
        tipo: "persona_fisica", nombre,
        email: a.email || null, telefono: a.telefono || null,
        persona_contacto: a.persona_contacto || null,
        dni: a.dni ? formatDocId(a.dni) : null,
        empresa: a.empresa || null,
        contact_id: contactId, client_id: null,
      });
    } else {
      let clientId = a.client_id || null;
      if (!clientId) {
        const [existing] = await db.select({ id: clients.id }).from(clients)
          .where(eq(clients.nombre, nombre)).limit(1);
        if (existing) {
          clientId = existing.id;
        } else if (ownerCollaboratorId) {
          const [ncl] = await db.insert(clients).values({
            nombre,
            email: a.email || null,
            telefono: a.telefono || null,
            cif: a.cif || null,
            direccion: a.direccion || null,
            cnae: a.cnae || null,
            web: a.web || null,
            collaborator_id: ownerCollaboratorId,
          }).returning();
          clientId = ncl.id;
        }
      }
      out.push({
        key: a.key || randomUUID(),
        tipo: "empresa", nombre,
        email: a.email || null, telefono: a.telefono || null,
        persona_contacto: a.persona_contacto || null,
        dni: null, empresa: null,
        contact_id: null, client_id: clientId,
      });
    }
  }
  return out;
}

/** Campos aval_* legacy espejando el primer avalista (compatibilidad con vistas antiguas). */
export function legacyAvalFields(avalistas: AvalistaStored[]) {
  const first = avalistas[0];
  if (!first) {
    return {
      tiene_aval: false, aval_tipo: null, aval_nombre: null, aval_email: null,
      aval_telefono: null, aval_persona_contacto: null, aval_dni: null,
      aval_empresa: null, aval_contact_id: null, aval_client_id: null,
    };
  }
  return {
    tiene_aval: true,
    aval_tipo: first.tipo,
    aval_nombre: first.nombre,
    aval_email: first.email,
    aval_telefono: first.telefono,
    aval_persona_contacto: first.persona_contacto,
    aval_dni: first.dni,
    aval_empresa: first.empresa,
    aval_contact_id: first.contact_id,
    aval_client_id: first.client_id,
  };
}

/** Lista de avalistas de una op: usa la columna avalistas y cae a los campos legacy. */
export function avalistasDeOp(op: {
  avalistas?: unknown;
  tiene_aval?: boolean | null;
  aval_tipo?: string | null;
  aval_nombre?: string | null;
  aval_email?: string | null;
  aval_telefono?: string | null;
  aval_persona_contacto?: string | null;
  aval_dni?: string | null;
  aval_empresa?: string | null;
  aval_contact_id?: string | null;
  aval_client_id?: string | null;
}): AvalistaStored[] {
  const arr = (op.avalistas as (AvalistaStored & { key?: string })[] | null) ?? [];
  if (arr.length > 0) {
    // Normaliza la key para entradas guardadas antes de que existiera
    return arr.map((a, i) => ({ ...a, key: a.key ?? a.contact_id ?? a.client_id ?? `aval-${i + 1}` }));
  }
  if (op.tiene_aval && op.aval_nombre) {
    return [{
      key: op.aval_contact_id ?? op.aval_client_id ?? "aval-1",
      tipo: (op.aval_tipo as "persona_fisica" | "empresa") ?? "persona_fisica",
      nombre: op.aval_nombre,
      email: op.aval_email ?? null,
      telefono: op.aval_telefono ?? null,
      persona_contacto: op.aval_persona_contacto ?? null,
      dni: op.aval_dni ?? null,
      empresa: op.aval_empresa ?? null,
      contact_id: op.aval_contact_id ?? null,
      client_id: op.aval_client_id ?? null,
    }];
  }
  return [];
}
