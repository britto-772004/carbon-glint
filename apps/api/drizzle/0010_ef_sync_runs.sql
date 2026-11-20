CREATE TABLE "ef_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"imported" text[] DEFAULT '{}' NOT NULL,
	"message" text DEFAULT '' NOT NULL
);
