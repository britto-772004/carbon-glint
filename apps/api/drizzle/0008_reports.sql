CREATE TYPE "public"."report_status" AS ENUM('queued', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"org_unit_id" uuid NOT NULL,
	"format" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "report_status" DEFAULT 'queued' NOT NULL,
	"file_key" text,
	"error" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_tenant_idx" ON "reports" USING btree ("tenant_id");