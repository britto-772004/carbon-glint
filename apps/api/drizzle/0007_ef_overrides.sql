CREATE TYPE "public"."override_type" AS ENUM('factor', 'custom_factor', 'custom_result');--> statement-breakpoint
CREATE TABLE "ef_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"type" "override_type" NOT NULL,
	"factor_id" uuid,
	"value" numeric(24, 10),
	"unit" text,
	"citation" text,
	"reason" text NOT NULL,
	"previous_co2e_kg" numeric(24, 6),
	"new_co2e_kg" numeric(24, 6) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reverted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ef_overrides" ADD CONSTRAINT "ef_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ef_overrides" ADD CONSTRAINT "ef_overrides_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ef_overrides" ADD CONSTRAINT "ef_overrides_factor_id_emission_factors_id_fk" FOREIGN KEY ("factor_id") REFERENCES "public"."emission_factors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ef_overrides_activity_idx" ON "ef_overrides" USING btree ("activity_id");