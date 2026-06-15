CREATE TYPE "public"."aval_tipo" AS ENUM('persona_fisica', 'empresa');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('banco', 'alternativa_financiera', 'renting');--> statement-breakpoint
CREATE TYPE "public"."equipo_tipo" AS ENUM('industrial', 'tecnologico');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('texto', 'euros', 'porcentaje', 'enlace');--> statement-breakpoint
CREATE TYPE "public"."modalidad_renting" AS ENUM('begreat_comisiona', 'begreat_factura', 'begreat_factura_comisiona');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('pendiente_de_validar', 'activa', 'archivada');--> statement-breakpoint
CREATE TYPE "public"."pipeline_key" AS ENUM('consultoria', 'renting');--> statement-breakpoint
CREATE TYPE "public"."renting_role" AS ENUM('proveedor', 'colaborador');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'colaborador');--> statement-breakpoint
CREATE TABLE "aval_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"size" integer,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"size" integer,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_group_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"rol" text,
	"email" text,
	"telefono" text,
	"linkedin" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"web" text,
	"cif_matriz" text,
	"codigo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_groups_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"cif" text,
	"email" text,
	"telefono" text,
	"web" text,
	"linkedin" text,
	"nombre_comercial" text,
	"direccion" text,
	"cnae" text,
	"provincia" text,
	"grupo_empresarial" text,
	"group_id" uuid,
	"codigo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "collaborator_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"rol" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborator_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborator_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collaborator_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"identificador" text NOT NULL,
	"role" "role" DEFAULT 'colaborador' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"logo_url" text,
	"telefono" text,
	"cif" text,
	"web" text,
	"num_trabajadores" integer,
	"razon_social" text,
	"notas_internas" text,
	"puede_editar_ops" boolean DEFAULT false NOT NULL,
	"puede_ver_entidades" boolean DEFAULT false NOT NULL,
	"nivel_entidades" integer DEFAULT 4 NOT NULL,
	"puede_publicar_sin_validar" boolean DEFAULT false NOT NULL,
	"codigo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collaborators_email_unique" UNIQUE("email"),
	CONSTRAINT "collaborators_identificador_unique" UNIQUE("identificador"),
	CONSTRAINT "collaborators_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "contact_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"rol" text,
	"linkedin" text,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"valor" text
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad" text NOT NULL,
	"etiqueta" text NOT NULL,
	"tipo" "field_type" NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_contact_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"rol" text,
	"email" text,
	"telefono" text,
	"linkedin" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_office_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"rol" text,
	"email" text,
	"telefono" text,
	"linkedin" text,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"ciudad" text,
	"direccion" text,
	"email" text,
	"telefono" text,
	"persona_contacto" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"notas" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "entity_type" NOT NULL,
	"email" text,
	"telefono" text,
	"web" text,
	"linkedin" text,
	"persona_contacto" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"notas" text,
	"logo_url" text,
	"nombre_oculto" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"mensaje" text NOT NULL,
	"respuesta" text,
	"respondido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office_contact_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"size" integer,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"pipeline_key" "pipeline_key" NOT NULL,
	"client_id" uuid,
	"supplier_id" uuid,
	"producto" text,
	"importe" numeric(12, 2),
	"renting_rol" "renting_role",
	"equipo_tipo" "equipo_tipo",
	"plazo_meses" integer,
	"lugar_entrega" text,
	"nombre" text,
	"fase" text NOT NULL,
	"status" "operation_status" DEFAULT 'pendiente_de_validar' NOT NULL,
	"comision_colaborador" numeric(12, 2),
	"comision_begreat" numeric(12, 2),
	"entidad_financiera" text,
	"honorarios_firmado" boolean DEFAULT false,
	"descripcion" text,
	"contacto_directo" boolean DEFAULT false,
	"entity_office_id" uuid,
	"notas_admin" text,
	"facturacion_renting" text,
	"onedrive_url" text,
	"motivo_denegacion" text,
	"fecha_cierre" timestamp,
	"tiene_aval" boolean DEFAULT false,
	"aval_tipo" "aval_tipo",
	"aval_nombre" text,
	"aval_email" text,
	"aval_telefono" text,
	"aval_persona_contacto" text,
	"aval_dni" text,
	"aval_empresa" text,
	"aval_contact_id" uuid,
	"aval_client_id" uuid,
	"modalidad_renting" "modalidad_renting",
	"importe_facturado_begreat" numeric(12, 2),
	"importe_facturado_visible" boolean DEFAULT false,
	"entidad_destino" text,
	"entidad_visible" boolean DEFAULT true,
	"entidad_preferencia" text,
	"necesidad" text,
	"es_renovacion" boolean DEFAULT false,
	"operacion_original_id" uuid,
	"codigo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operations_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "pipeline_key" NOT NULL,
	"label" text NOT NULL,
	"fases" jsonb NOT NULL,
	CONSTRAINT "pipelines_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"web" text,
	"persona_contacto" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"codigo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "aval_documents" ADD CONSTRAINT "aval_documents_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_group_contacts" ADD CONSTRAINT "client_group_contacts_group_id_client_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."client_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_group_id_client_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."client_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborator_contacts" ADD CONSTRAINT "collaborator_contacts_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborator_notes" ADD CONSTRAINT "collaborator_notes_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborator_notes" ADD CONSTRAINT "collaborator_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborator_users" ADD CONSTRAINT "collaborator_users_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_contact_notes" ADD CONSTRAINT "entity_contact_notes_contact_id_entity_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."entity_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_contact_notes" ADD CONSTRAINT "entity_contact_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_contacts" ADD CONSTRAINT "entity_contacts_entity_id_financial_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."financial_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_notes" ADD CONSTRAINT "entity_notes_entity_id_financial_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."financial_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_notes" ADD CONSTRAINT "entity_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_office_contacts" ADD CONSTRAINT "entity_office_contacts_office_id_entity_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."entity_offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_offices" ADD CONSTRAINT "entity_offices_entity_id_financial_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."financial_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_requests" ADD CONSTRAINT "info_requests_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "info_requests" ADD CONSTRAINT "info_requests_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_contact_notes" ADD CONSTRAINT "office_contact_notes_contact_id_entity_office_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."entity_office_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_contact_notes" ADD CONSTRAINT "office_contact_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_notes" ADD CONSTRAINT "office_notes_office_id_entity_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."entity_offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_notes" ADD CONSTRAINT "office_notes_author_id_collaborators_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_documents" ADD CONSTRAINT "operation_documents_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_entity_office_id_entity_offices_id_fk" FOREIGN KEY ("entity_office_id") REFERENCES "public"."entity_offices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_aval_contact_id_contacts_id_fk" FOREIGN KEY ("aval_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_aval_client_id_clients_id_fk" FOREIGN KEY ("aval_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE no action ON UPDATE no action;