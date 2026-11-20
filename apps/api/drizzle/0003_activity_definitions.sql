CREATE TYPE "public"."activity_definition_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."data_source_status" AS ENUM('uploaded', 'importing', 'imported', 'failed');--> statement-breakpoint
CREATE TYPE "public"."mapping_mode" AS ENUM('ai', 'manual');--> statement-breakpoint
CREATE TABLE "ghg_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"scope" smallint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ghg_categories_tenant_code_unique" UNIQUE NULLS NOT DISTINCT("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "industry_categories" (
	"industry_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "industry_categories_industry_id_category_id_pk" PRIMARY KEY("industry_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_definition_id" uuid NOT NULL,
	"data_source_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"measure" numeric(20, 6) NOT NULL,
	"unit" text NOT NULL,
	"org_unit_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"spend" numeric(20, 4),
	"currency" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"scope" smallint NOT NULL,
	"category_id" uuid NOT NULL,
	"default_org_unit_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "activity_definition_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_definition_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"sheets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sheet_name" text,
	"header_row" integer DEFAULT 1 NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"mapping" jsonb,
	"mapping_mode" "mapping_mode",
	"status" "data_source_status" DEFAULT 'uploaded' NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ghg_categories" ADD CONSTRAINT "ghg_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD CONSTRAINT "industry_categories_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD CONSTRAINT "industry_categories_category_id_ghg_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ghg_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_definition_id_activity_definitions_id_fk" FOREIGN KEY ("activity_definition_id") REFERENCES "public"."activity_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_definitions" ADD CONSTRAINT "activity_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_definitions" ADD CONSTRAINT "activity_definitions_category_id_ghg_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ghg_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_definitions" ADD CONSTRAINT "activity_definitions_default_org_unit_id_org_units_id_fk" FOREIGN KEY ("default_org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_definitions" ADD CONSTRAINT "activity_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_activity_definition_id_activity_definitions_id_fk" FOREIGN KEY ("activity_definition_id") REFERENCES "public"."activity_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ghg_categories_scope_idx" ON "ghg_categories" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "activities_tenant_idx" ON "activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activities_ad_idx" ON "activities" USING btree ("activity_definition_id");--> statement-breakpoint
CREATE INDEX "activities_ds_idx" ON "activities" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "activities_org_unit_idx" ON "activities" USING btree ("org_unit_id");--> statement-breakpoint
CREATE INDEX "activity_definitions_tenant_idx" ON "activity_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "data_sources_ad_idx" ON "data_sources" USING btree ("activity_definition_id");