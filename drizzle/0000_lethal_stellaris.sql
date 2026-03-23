CREATE TABLE "probe_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"phrase_label" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"ttfb_ms" integer NOT NULL,
	"total_time_ms" integer NOT NULL,
	"audio_duration_ms" integer,
	"status_code" integer NOT NULL,
	"error_message" text,
	"region" text
);
--> statement-breakpoint
CREATE INDEX "idx_provider_timestamp" ON "probe_results" USING btree ("provider_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_timestamp" ON "probe_results" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_provider_errors" ON "probe_results" USING btree ("provider_id","status_code");