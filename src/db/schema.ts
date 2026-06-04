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
export const rentingRoleEnum = pgEnum("renting_role", ["proveedor", "colaborador"]);
export const equipoTipoEnum = pgEnum("equipo_tipo", ["industrial", "tecnologico"]);
export const entityTypeEnum = pgEnum("entity_type", ["banco", "alternativa_financiera", "renting"]);

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
  cif: text("cif"),
  web: text("web"),
  num_trabajadores: integer("num_trabajadores"),
  razon_social: text("razon_social"),
  notas_internas: text("notas_internas"),
  puede_editar_ops: boolean("puede_editar_ops").notNull().default(false),
  puede_ver_entidades: boolean("puede_ver_entidades").notNull().default(false),
  codigo: text("codigo").unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Collaborator contact persons ─────────────────────────────────────────────
export const collaboratorContacts = pgTable("collaborator_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id")
    .notNull()
    .references(() => collaborators.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  rol: text("rol"),
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
  linkedin: text("linkedin"),
  codigo: text("codigo").unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client notes ────────────────────────────────────────────────────────────
export const clientNotes = pgTable("client_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  client_id: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Contacts (of clients) ────────────────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  client_id: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  rol: text("rol"),
  linkedin: text("linkedin"),
  notas: text("notas"),
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
  persona_contacto: text("persona_contacto"),
  contacto_email: text("contacto_email"),
  contacto_telefono: text("contacto_telefono"),
  codigo: text("codigo").unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Financial entities ───────────────────────────────────────────────────────
export const financialEntities = pgTable("financial_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  tipo: entityTypeEnum("tipo").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  web: text("web"),
  linkedin: text("linkedin"),
  persona_contacto: text("persona_contacto"),
  contacto_email: text("contacto_email"),
  contacto_telefono: text("contacto_telefono"),
  notas: text("notas"),
  logo_url: text("logo_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity notes (notes feed for financial entities) ────────────────────────
export const entityNotes = pgTable("entity_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_id: uuid("entity_id").notNull().references(() => financialEntities.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity contacts (persons linked to financial entities) ──────────────────
export const entityContacts = pgTable("entity_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_id: uuid("entity_id")
    .notNull()
    .references(() => financialEntities.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  rol: text("rol"),
  email: text("email"),
  telefono: text("telefono"),
  linkedin: text("linkedin"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity offices (sub-offices of financial entities) ───────────────────────
export const entityOffices = pgTable("entity_offices", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_id: uuid("entity_id")
    .notNull()
    .references(() => financialEntities.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  ciudad: text("ciudad"),
  direccion: text("direccion"),
  email: text("email"),
  telefono: text("telefono"),
  persona_contacto: text("persona_contacto"),
  contacto_email: text("contacto_email"),
  contacto_telefono: text("contacto_telefono"),
  notas: text("notas"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity contact notes (notes feed for entity contact persons) ────────────
export const entityContactNotes = pgTable("entity_contact_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contact_id: uuid("contact_id").notNull().references(() => entityContacts.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity office contacts ───────────────────────────────────────────────────
export const entityOfficeContacts = pgTable("entity_office_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  office_id: uuid("office_id")
    .notNull()
    .references(() => entityOffices.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  rol: text("rol"),
  email: text("email"),
  telefono: text("telefono"),
  linkedin: text("linkedin"),
  notas: text("notas"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Office contact notes (notes feed for office contact persons) ─────────────
export const officeContactNotes = pgTable("office_contact_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contact_id: uuid("contact_id").notNull().references(() => entityOfficeContacts.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Collaborator notes ───────────────────────────────────────────────────────
export const collaboratorNotes = pgTable("collaborator_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id").notNull().references(() => collaborators.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
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
  // Consultoría fields
  producto: text("producto"),
  importe: numeric("importe", { precision: 12, scale: 2 }),
  // Renting fields
  renting_rol: rentingRoleEnum("renting_rol"),
  equipo_tipo: equipoTipoEnum("equipo_tipo"),
  plazo_meses: integer("plazo_meses"),
  lugar_entrega: text("lugar_entrega"),
  // Common
  nombre: text("nombre"),
  fase: text("fase").notNull(),
  status: operationStatusEnum("status").notNull().default("pendiente_de_validar"),
  comision_colaborador: numeric("comision_colaborador", { precision: 12, scale: 2 }),
  comision_begreat: numeric("comision_begreat", { precision: 12, scale: 2 }),
  entidad_financiera: text("entidad_financiera"),
  honorarios_firmado: boolean("honorarios_firmado").default(false),
  descripcion: text("descripcion"),
  contacto_directo: boolean("contacto_directo").default(false),
  // Admin-only fields
  entity_office_id: uuid("entity_office_id").references(() => entityOffices.id, { onDelete: "set null" }),
  notas_admin: text("notas_admin"),
  facturacion_renting: text("facturacion_renting"),
  onedrive_url: text("onedrive_url"),
  motivo_denegacion: text("motivo_denegacion"),
  codigo: text("codigo").unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Office notes (same concept as operation notes) ──────────────────────────
export const officeNotes = pgTable("office_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  office_id: uuid("office_id")
    .notNull()
    .references(() => entityOffices.id, { onDelete: "cascade" }),
  author_id: uuid("author_id")
    .notNull()
    .references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
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
  entidad: text("entidad").notNull(),
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
