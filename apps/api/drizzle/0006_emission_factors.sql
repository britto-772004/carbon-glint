CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."calculation_method" AS ENUM('ai', 'search', 'override', 'none');--> statement-breakpoint
CREATE TYPE "public"."calculation_status" AS ENUM('matched', 'needs_review', 'unmatched', 'overridden');--> statement-breakpoint
CREATE TABLE "calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"activity_definition_id" uuid NOT NULL,
	"org_unit_id" uuid,
	"scope" smallint NOT NULL,
	"category_id" uuid NOT NULL,
	"factor_id" uuid,
	"method" "calculation_method" NOT NULL,
	"status" "calculation_status" NOT NULL,
	"confidence" real,
	"normalized_quantity" numeric(24, 8),
	"conversion_factor" numeric(24, 12),
	"co2e_kg" numeric(24, 6) DEFAULT 0 NOT NULL,
	"trace" text DEFAULT '{}' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calculations_activityId_unique" UNIQUE("activity_id")
);
--> statement-breakpoint
CREATE TABLE "ef_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"publisher" text NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"year" integer NOT NULL,
	"licence" text NOT NULL,
	"url" text NOT NULL,
	"factor_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ef_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "emission_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"scope_hint" smallint,
	"region" text DEFAULT 'GLOBAL' NOT NULL,
	"year" integer NOT NULL,
	"unit" text,
	"unit_label" text NOT NULL,
	"co2e_per_unit" numeric(24, 10) NOT NULL,
	"co2_per_unit" numeric(24, 10),
	"ch4_per_unit" numeric(24, 10),
	"n2o_per_unit" numeric(24, 10),
	"citation_url" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("category", ''))) STORED,
	CONSTRAINT "emission_factors_source_external_unique" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_activity_definition_id_activity_definitions_id_fk" FOREIGN KEY ("activity_definition_id") REFERENCES "public"."activity_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_category_id_ghg_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ghg_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_factor_id_emission_factors_id_fk" FOREIGN KEY ("factor_id") REFERENCES "public"."emission_factors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emission_factors" ADD CONSTRAINT "emission_factors_source_id_ef_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ef_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calculations_tenant_idx" ON "calculations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "calculations_ad_idx" ON "calculations" USING btree ("activity_definition_id");--> statement-breakpoint
CREATE INDEX "calculations_org_unit_idx" ON "calculations" USING btree ("org_unit_id");--> statement-breakpoint
CREATE INDEX "calculations_status_idx" ON "calculations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "emission_factors_search_idx" ON "emission_factors" USING gin ("search");--> statement-breakpoint
CREATE INDEX "emission_factors_name_trgm_idx" ON "emission_factors" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "emission_factors_unit_idx" ON "emission_factors" USING btree ("unit");