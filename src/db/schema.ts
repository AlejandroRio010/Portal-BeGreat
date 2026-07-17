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
  serial,
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
export const avalTipoEnum = pgEnum("aval_tipo", ["persona_fisica", "empresa"]);
export const modalidadRentingEnum = pgEnum("modalidad_renting", ["begreat_comisiona", "begreat_factura", "begreat_factura_comisiona"]);

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
  // Autónomo → sus facturas llevan IVA 21% y retención de IRPF 7% (para el motor
  // de comisiones/pagos y el futuro cálculo de impuestos).
  es_autonomo: boolean("es_autonomo").notNull().default(false),
  notas_internas: text("notas_internas"),
  puede_editar_ops: boolean("puede_editar_ops").notNull().default(false),
  puede_ver_entidades: boolean("puede_ver_entidades").notNull().default(false),
  nivel_entidades: integer("nivel_entidades").notNull().default(4),
  puede_publicar_sin_validar: boolean("puede_publicar_sin_validar").notNull().default(false),
  puede_enviar_recordatorios: boolean("puede_enviar_recordatorios").notNull().default(false),
  codigo: text("codigo").unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Collaborator users (login accounts per company) ─────────────────────────
export const collaboratorUsers = pgTable("collaborator_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id")
    .notNull()
    .references(() => collaborators.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  activo: boolean("activo").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Password reset tokens ────────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
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
// ─── Client groups (grupos empresariales) ────────────────────────────────────
export const clientGroups = pgTable("client_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  web: text("web"),
  cif_matriz: text("cif_matriz"),
  codigo: text("codigo").unique(),
  collaborator_id: uuid("collaborator_id").references(() => collaborators.id, { onDelete: "set null" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const clientGroupContacts = pgTable("client_group_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  group_id: uuid("group_id").notNull().references(() => clientGroups.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  rol: text("rol"),
  email: text("email"),
  telefono: text("telefono"),
  linkedin: text("linkedin"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client group notes ─────────────────────────────────────────────────────
export const clientGroupNotes = pgTable("client_group_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  group_id: uuid("group_id").notNull().references(() => clientGroups.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

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
  nombre_comercial: text("nombre_comercial"),
  direccion: text("direccion"),
  cnae: text("cnae"),
  provincia: text("provincia"),
  grupo_empresarial: text("grupo_empresarial"),
  group_id: uuid("group_id").references(() => clientGroups.id, { onDelete: "set null" }),
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
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client documents ────────────────────────────────────────────────────────
export const clientDocuments = pgTable("client_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  client_id: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploaded_by: text("uploaded_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Contact notes (notes for client contact persons) ────────────────────────
export const contactNotes = pgTable("contact_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contact_id: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
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
    .references(() => collaborators.id),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  web: text("web"),
  persona_contacto: text("persona_contacto"),
  contacto_email: text("contacto_email"),
  contacto_telefono: text("contacto_telefono"),
  codigo: text("codigo").unique(),
  cif: text("cif"),
  razon_social: text("razon_social"),
  nombre_comercial: text("nombre_comercial"),
  direccion: text("direccion"),
  cnae: text("cnae"),
  provincia: text("provincia"),
  logo_url: text("logo_url"),
  portal_activo: boolean("portal_activo").notNull().default(false),
  puede_ver_entidades: boolean("puede_ver_entidades").notNull().default(false),
  notas_internas: text("notas_internas"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Supplier users (login accounts per supplier company) ───────────────────
export const supplierUsers = pgTable("supplier_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplier_id: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  activo: boolean("activo").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Supplier products (catalog) ────────────────────────────────────────────
export const supplierProducts = pgTable("supplier_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplier_id: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  tipo: equipoTipoEnum("tipo"),
  precio_venta: numeric("precio_venta", { precision: 12, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Supplier documents ─────────────────────────────────────────────────────
export const supplierDocuments = pgTable("supplier_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplier_id: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploaded_by: text("uploaded_by").notNull(),
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
  nombre_oculto: boolean("nombre_oculto").notNull().default(false),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity notes (notes feed for financial entities) ────────────────────────
export const entityNotes = pgTable("entity_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_id: uuid("entity_id").notNull().references(() => financialEntities.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
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
  created_by: uuid("created_by"),
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
  created_by: uuid("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Entity contact notes (notes feed for entity contact persons) ────────────
export const entityContactNotes = pgTable("entity_contact_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contact_id: uuid("contact_id").notNull().references(() => entityContacts.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
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
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Supplier notes ──────────────────────────────────────────────────────────
export const supplierNotes = pgTable("supplier_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplier_id: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Collaborator notes ───────────────────────────────────────────────────────
export const collaboratorNotes = pgTable("collaborator_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  collaborator_id: uuid("collaborator_id").notNull().references(() => collaborators.id, { onDelete: "cascade" }),
  author_id: uuid("author_id").notNull().references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  texto: text("texto").notNull(),
  pinned: boolean("pinned").notNull().default(false),
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
  comision_colaborador_pct: numeric("comision_colaborador_pct", { precision: 5, scale: 2 }),
  comision_begreat: numeric("comision_begreat", { precision: 12, scale: 2 }),
  comision_begreat_pct: numeric("comision_begreat_pct", { precision: 5, scale: 2 }),
  comision_origenes: jsonb("comision_origenes").default([]),
  colaboradores_comision: jsonb("colaboradores_comision").default([]),
  margen_pct: numeric("margen_pct", { precision: 5, scale: 2 }),
  factura_destinatario: text("factura_destinatario"),
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
  fecha_cierre: timestamp("fecha_cierre"),
  // Aval
  tiene_aval: boolean("tiene_aval").default(false),
  aval_tipo: avalTipoEnum("aval_tipo"),
  aval_nombre: text("aval_nombre"),
  aval_email: text("aval_email"),
  aval_telefono: text("aval_telefono"),
  aval_persona_contacto: text("aval_persona_contacto"),
  aval_dni: text("aval_dni"),
  aval_empresa: text("aval_empresa"),
  aval_contact_id: uuid("aval_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  aval_client_id: uuid("aval_client_id").references(() => clients.id, { onDelete: "set null" }),
  // Lista completa de avalistas; los campos aval_* de arriba son espejo del primero (legacy)
  avalistas: jsonb("avalistas").default([]),
  // Facturas de Holded vinculadas a esta operación (sección finanzas).
  // holded_invoices = lista [{id, number}]; los campos single son espejo del primero (legacy).
  holded_invoice_id: text("holded_invoice_id"),
  holded_invoice_number: text("holded_invoice_number"),
  holded_invoices: jsonb("holded_invoices").default([]),
  // Facturas de COMPRA de Holded vinculadas a la op (lado del pago):
  // pago a proveedor/cliente (mercadería) y pago de comisión a colaboradores.
  // Cada entrada: {id, number, tipo: "pago" | "comision", colaborador_id?}
  holded_purchases: jsonb("holded_purchases").default([]),
  // Movimientos liquidados por OBLIVIATE (no están en Holded/Bearing). Se marcan
  // a mano. Cada entrada: {tipo: "cobro"|"mercaderia"|"comision", colaborador_id?,
  // importe, fecha, pagado}. Cada lado se resuelve por Holded O por Obliviate.
  obliviate_mov: jsonb("obliviate_mov").default([]),
  // Modalidad renting
  modalidad_renting: modalidadRentingEnum("modalidad_renting"),
  importe_facturado_begreat: numeric("importe_facturado_begreat", { precision: 12, scale: 2 }),
  cuota_mensual: numeric("cuota_mensual", { precision: 10, scale: 2 }),
  cuota_aproximada_min: numeric("cuota_aproximada_min", { precision: 10, scale: 2 }),
  cuota_aproximada_max: numeric("cuota_aproximada_max", { precision: 10, scale: 2 }),
  cuota_definitiva: numeric("cuota_definitiva", { precision: 10, scale: 2 }),
  fecha_contrato: timestamp("fecha_contrato"),
  fecha_fin_contrato: timestamp("fecha_fin_contrato"),
  importe_facturado_visible: boolean("importe_facturado_visible").default(false),
  // Entidad destino (cuando un broker lleva la op a otro banco)
  entidad_destino: text("entidad_destino"),
  // Visibilidad entidad para colaborador (bancos siempre visibles, alt/renting toggle)
  entidad_visible: boolean("entidad_visible").default(true),
  // Preferencia de entidad financiera (texto libre del colaborador nivel 3-4)
  entidad_preferencia: text("entidad_preferencia"),
  // Necesidad del cliente
  necesidad: text("necesidad"),
  es_renovacion: boolean("es_renovacion").default(false),
  operacion_original_id: uuid("operacion_original_id"),
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
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Operation documents ─────────────────────────────────────────────────────
export const operationDocuments = pgTable("operation_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation_id: uuid("operation_id").notNull().references(() => operations.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploaded_by: text("uploaded_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Aval (guarantor) documents ──────────────────────────────────────────────
export const avalDocuments = pgTable("aval_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation_id: uuid("operation_id").notNull().references(() => operations.id, { onDelete: "cascade" }),
  // Clave del avalista dentro de operations.avalistas; null = docs antiguos (primer avalista)
  avalista_key: text("avalista_key"),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploaded_by: text("uploaded_by").notNull(),
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
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Info requests (admin → collaborator) ────────────────────────────────────
export const infoRequests = pgTable("info_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation_id: uuid("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  author_id: uuid("author_id")
    .notNull()
    .references(() => collaborators.id),
  author_name: text("author_name").notNull(),
  mensaje: text("mensaje").notNull(),
  respuesta: text("respuesta"),
  respondido: boolean("respondido").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
  responded_at: timestamp("responded_at"),
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

// ─── Tareas de operación ─────────────────────────────────────────────────────
export const taskAssigneeEnum = pgEnum("task_assignee", ["admin", "colaborador", "cliente", "avalista"]);

export const operationTasks = pgTable("operation_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  operation_id: uuid("operation_id").notNull().references(() => operations.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  asignado_a: taskAssigneeEnum("asignado_a").notNull(),
  asignado_a_id: uuid("asignado_a_id"),
  asignado_a_nombre: text("asignado_a_nombre"),
  completada: boolean("completada").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
  created_by_role: text("created_by_role").notNull(),
  created_by_id: uuid("created_by_id").notNull(),
  fecha_programada: timestamp("fecha_programada"),
  recordatorio_enviado: boolean("recordatorio_enviado").default(false).notNull(),
});

// ─── Tareas genéricas de entidad ─────────────────────────────────────────────
export const entityTasks = pgTable("entity_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_type: text("entity_type").notNull(),
  entity_id: uuid("entity_id").notNull(),
  titulo: text("titulo").notNull(),
  asignado_a_nombre: text("asignado_a_nombre"),
  completada: boolean("completada").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
  created_by_id: uuid("created_by_id").notNull(),
  fecha_programada: timestamp("fecha_programada"),
});

// ─── Gastos fijos (finanzas) ─────────────────────────────────────────────────
// Lista editable de proveedores que la empresa considera "gasto fijo". El motor
// cruza cada proveedor con las compras reales de Holded y su conciliación de pago.
// Se gestiona desde el portal (no se toca código); si el proveedor no está aquí,
// su factura cuenta como gasto variable.
export const gastosFijos = pgTable("gastos_fijos", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  // Subcadena del nombre del proveedor (normalizada) para casar sus facturas.
  proveedor_match: text("proveedor_match").notNull(),
  // Id de contacto de Holded: si está, el match es exacto (más fiable que el nombre).
  holded_contact_id: text("holded_contact_id"),
  // Importe mensual esperado con IVA; null = importe variable.
  mensual: numeric("mensual", { precision: 10, scale: 2 }),
  categoria: text("categoria"),
  nota: text("nota"),
  // Empresa a la que pertenece el gasto fijo: bearing (cruza con Holded) u
  // obliviate (manual, no está en Holded).
  empresa: text("empresa").notNull().default("bearing"),
  // Periodicidad del cobro: "mensual" (todos los meses) o "anual" (solo en
  // mes_cobro, p. ej. renovación de dominio). Para los fijos manuales de Obliviate.
  periodicidad: text("periodicidad").notNull().default("mensual"),
  mes_cobro: integer("mes_cobro"), // 1-12, solo para los anuales
  activo: boolean("activo").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cotizador: deals de referencia para calibrar TAEs ────────────────────────
export const cotizadorDeals = pgTable("cotizador_deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entidad: text("entidad").notNull(),
  cliente: text("cliente").notNull(),
  importe: numeric("importe", { precision: 12, scale: 2 }).notNull(),
  cuota: numeric("cuota", { precision: 10, scale: 2 }).notNull(),
  plazo_meses: integer("plazo_meses").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Checklist documental ────────────────────────────────────────────────────

export const docChecklistTypeEnum = pgEnum("doc_checklist_type", ["simple", "anual", "trimestral"]);
export const docEntityTypeEnum = pgEnum("doc_entity_type", ["cliente", "proveedor", "avalista"]);

export const docChecklistTemplates = pgTable("doc_checklist_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  tipo: docChecklistTypeEnum("tipo").notNull().default("simple"),
  parent_id: uuid("parent_id"),
  orden: serial("orden"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const docChecklistCustomItems = pgTable("doc_checklist_custom_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_type: docEntityTypeEnum("entity_type").notNull(),
  entity_id: uuid("entity_id").notNull(),
  nombre: text("nombre").notNull(),
  tipo: docChecklistTypeEnum("tipo").notNull().default("simple"),
  orden: serial("orden"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const docChecklistEntries = pgTable("doc_checklist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  entity_type: docEntityTypeEnum("entity_type").notNull(),
  entity_id: uuid("entity_id").notNull(),
  template_id: uuid("template_id").references(() => docChecklistTemplates.id, { onDelete: "cascade" }),
  custom_item_id: uuid("custom_item_id").references(() => docChecklistCustomItems.id, { onDelete: "cascade" }),
  year: integer("year"),
  quarter: integer("quarter"),
  checked: boolean("checked").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
