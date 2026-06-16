CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"tipo" "equipo_tipo",
	"precio_venta" numeric(12, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "collaborator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "cif" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "razon_social" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "portal_activo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "puede_ver_entidades" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "notas_internas" text;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_users" ADD CONSTRAINT "supplier_users_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;