-- stock_events: one row per base_status change (not per poll).
-- Backfill is separate; deploy migrate must stay fast.
CREATE TABLE IF NOT EXISTS "stock_events" (
	"id" text PRIMARY KEY NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"server_type_code" text NOT NULL,
	"location_code" text NOT NULL,
	"base_status" text NOT NULL,
	"prev_status" text,
	"previous_sold_out_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_events_observed_at_idx" ON "stock_events" USING btree ("observed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_events_cell_observed_at_idx" ON "stock_events" USING btree ("server_type_code","location_code","observed_at");
