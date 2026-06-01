import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "colaborador"]);
export const pipelineKeyEnum = pgEnum("pipeline_key", ["consultoria", "renting"]);
export const fieldTypeEnum = pgEnum("field_type", ["texto", "euros", "porcentaje", "enlace"]);
export const operationStatusEnum = pgEnum("operation_status", [
  "pendiente_de_validar",
  "activa",
  "archivada",
]);

// ─── Collaborators (users) ────────────────────────────────────────────────────
export const collaborators = pgTable("collaborators", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  identificador: text("identificador").notNull().unique(),
  role: roleEnum("role").notNull().default("colaborador"),
  activo: boolean("activo").notNull().default(true),
  logo_url: text("logo_url"),
  telefono: text("telefono"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Pipelines ────────────────────────────────────────────────────────────────
export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: pipelineKeyEnum("key").notNull().unique(),
  label: text("label").notNull(),
  fases: jsonb("fases").notNull().$type<string[]>(),
});

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id")
    .notNull()
    .references(() => collaborators.id),
  nombre: text("nombre").notNull(),
  cif: text("cif"),
  email: text("email"),
  telefono: text("telefono"),
  web: text("web"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Contacts ────────────────────────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  client_id: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
});

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id")
    .notNull()
    .references(() => collaborators.id),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  web: text("web"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Operations ───────────────────────────────────────────────────────────────
export const operations = pgTable("operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id")
    .notNull()
    .references(() => collaborators.id),
  pipeline_key: pipelineKeyEnum("pipeline_key").notNull(),
  client_id: uuid("client_id").references(() => clients.id),
  supplier_id: uuid("supplier_id").references(() => suppliers.id),
  producto: text("producto"),
  importe: numeric("importe", { precision: 12, scale: 2 }),
  fase: text("fase").notNull(),
  status: operationStatusEnum("status").notNull().default("pendiente_de_validar"),
  comision_colaborador: numeric("comision_colaborador", { precision: 12, scale: 2 }),
  comision_begreat: numeric("comision_begreat", { precision: 12, scale: 2 }),
  entidad_financiera: text("entidad_financiera"),
  honorarios_firmado: boolean("honorarios_firmado").default(false),
  descripcion: text("descripcion"),
  lugar_entrega: text("lugar_entrega"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Notes ───────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation_id: uuid("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  author_id: uuid("author_id")
    .notNull()
    .references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Custom fields definition ─────────────────────────────────────────────────
export const customFields = pgTable("custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  entidad: text("entidad").notNull(), // "operation" | "client"
  etiqueta: text("etiqueta").notNull(),
  tipo: fieldTypeEnum("tipo").notNull(),
  orden: integer("orden").notNull().default(0),
});

// ─── Custom field values ──────────────────────────────────────────────────────
export const customFieldValues = pgTable("custom_field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  field_id: uuid("field_id")
    .notNull()
    .references(() => customFields.id, { onDelete: "cascade" }),
  entity_id: uuid("entity_id").notNull(),
  valor: text("valor"),
});
